import { RealtimeChannel, SupabaseClient, RealtimePresenceState } from '@supabase/supabase-js';

/**
 * Message represents the structure of a message stored in the database messages table.
 */
export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

/**
 * UserPresence represents a single active connection/session of a user.
 * Since a user can be connected on multiple tabs or devices, Supabase Presence tracks all sessions.
 */
export interface UserPresence {
  presenceId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  onlineAt: string;
  status: 'online' | 'away' | 'offline';
  customStatus?: string;
}

/**
 * TypingIndicator represents the current typing status of a specific user.
 */
export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
  timestamp: number;
}

/**
 * ConnectionState represents the lifecycle state of the WebSocket bridge.
 */
export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

/**
 * Direct Zustand-compatible interface for client stores.
 */
export interface RealtimeStore {
  messages: Message[];
  onlineUsers: Record<string, UserPresence[]>;
  typingUsers: Record<string, TypingIndicator>;
  connectionState: ConnectionState;
  
  addMessage: (message: Message) => void;
  setOnlineUsers: (users: Record<string, UserPresence[]>) => void;
  setTypingUser: (userId: string, typingState: TypingIndicator | null) => void;
  setConnectionState: (state: ConnectionState) => void;
}

/**
 * Configuration options for the WebSocketBridge.
 * Supports direct Zustand store coupling or custom callbacks for maximum flexibility.
 */
export interface WebSocketBridgeOptions {
  supabase: SupabaseClient;
  roomId?: string; // Optional: filter messages/events to a specific chat room
  userId: string;  // Active user's ID
  username: string; // Active user's name
  avatarUrl?: string; // Active user's avatar
  status?: 'online' | 'away' | 'offline';
  customStatus?: string;

  // Store Callbacks (optional, decupled)
  onMessageReceived?: (message: Message) => void;
  onPresenceSync?: (onlineUsers: Record<string, UserPresence[]>) => void;
  onTypingStatusChange?: (userId: string, typingState: TypingIndicator | null) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;

  // Direct Zustand Store Reference (optional)
  store?: {
    addMessage?: (message: Message) => void;
    setOnlineUsers?: (users: Record<string, UserPresence[]>) => void;
    setTypingUser?: (userId: string, typingState: TypingIndicator | null) => void;
    setConnectionState?: (state: ConnectionState) => void;
  };
}

/**
 * WebSocketBridge manages real-time messaging sync, presence, and typing indicators.
 * It integrates natively with Supabase Realtime (Postgres changes, Presence, and Broadcasts)
 * and bridges it seamlessly to Zustand client-side state stores.
 */
export class WebSocketBridge {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private roomId?: string;
  private userId: string;
  private username: string;
  private avatarUrl?: string;
  private status: 'online' | 'away' | 'offline';
  private customStatus?: string;

  // Callbacks
  private onMessageReceived?: (message: Message) => void;
  private onPresenceSync?: (onlineUsers: Record<string, UserPresence[]>) => void;
  private onTypingStatusChange?: (userId: string, typingState: TypingIndicator | null) => void;
  private onConnectionStateChange?: (state: ConnectionState) => void;

  // Direct store hookups
  private store?: WebSocketBridgeOptions['store'];

  // Typing state tracking
  private isLocallyTyping = false;
  private lastTypingBroadcastTime = 0;
  private typingBroadcastInterval = 1500; // Throttle sending typing state to once every 1.5s
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private typingDecayTime = 4000; // Auto-clear typing indicators if no updates in 4s

  constructor(options: WebSocketBridgeOptions) {
    this.supabase = options.supabase;
    this.roomId = options.roomId;
    this.userId = options.userId;
    this.username = options.username;
    this.avatarUrl = options.avatarUrl;
    this.status = options.status || 'online';
    this.customStatus = options.customStatus;

    this.onMessageReceived = options.onMessageReceived;
    this.onPresenceSync = options.onPresenceSync;
    this.onTypingStatusChange = options.onTypingStatusChange;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.store = options.store;
  }

  /**
   * Establishes connections, subscribes to channels, and starts listening to events.
   */
  public connect(): void {
    if (this.channel) {
      console.warn('[WebSocketBridge] Already connected or connecting. Disconnecting first.');
      this.disconnect();
    }

    this.updateConnectionState('CONNECTING');

    // Create a unique channel name.
    const channelName = this.roomId 
      ? `room:${this.roomId}`
      : 'global:realtime';

    console.log(`[WebSocketBridge] Subscribing to channel: ${channelName}`);

    // Initialize Supabase Channel
    this.channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    });

    // 1. Listen to Postgres Replication for messages table INSERT events
    const postgresFilter = this.roomId 
      ? `room_id=eq.${this.roomId}`
      : undefined;

    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        ...(postgresFilter ? { filter: postgresFilter } : {}),
      },
      (payload) => {
        console.log('[WebSocketBridge] Database replication event (INSERT) received:', payload);
        const newMessage = payload.new as Message;
        this.handleMessageReceived(newMessage);
      }
    );

    // 2. Setup Presence Syncing (Online/Offline Tracking)
    this.channel.on('presence', { event: 'sync' }, () => {
      this.handlePresenceSync();
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log(`[WebSocketBridge] User joined: ${key}`, newPresences);
    });

    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log(`[WebSocketBridge] User left: ${key}`, leftPresences);
    });

    // 3. Listen to Typing indicators via WebSocket Broadcasts
    this.channel.on('broadcast', { event: 'typing' }, (payload) => {
      this.handleTypingBroadcast(payload);
    });

    // 4. Subscribe and Track Presence
    this.channel.subscribe(async (status, err) => {
      if (err) {
        console.error('[WebSocketBridge] Subscription error:', err);
        this.updateConnectionState('ERROR');
        return;
      }

      console.log(`[WebSocketBridge] Channel subscription status: ${status}`);

      if (status === 'SUBSCRIBED') {
        this.updateConnectionState('CONNECTED');
        
        // Track this user's presence state
        try {
          await this.channel?.track({
            userId: this.userId,
            username: this.username,
            avatarUrl: this.avatarUrl,
            onlineAt: new Date().toISOString(),
            status: this.status,
            customStatus: this.customStatus,
          });
          console.log('[WebSocketBridge] Successfully tracked user presence state');
        } catch (presenceErr) {
          console.error('[WebSocketBridge] Failed to track presence:', presenceErr);
        }
      } else if (status === 'CLOSED') {
        this.updateConnectionState('DISCONNECTED');
      } else if (status === 'TIMED_OUT') {
        this.updateConnectionState('ERROR');
      }
    });
  }

  /**
   * Broadcasts typing indicators to other clients on the channel.
   * Employs throttling to avoid flooding the WebSocket connection during rapid keystrokes.
   */
  public sendTypingStatus(isTyping: boolean): void {
    if (!this.channel) {
      console.warn('[WebSocketBridge] Cannot send typing status: Not connected.');
      return;
    }

    const now = Date.now();
    this.isLocallyTyping = isTyping;

    // Send immediately if stopping typing, or if enough time has passed since the last active typing broadcast
    if (!isTyping || (now - this.lastTypingBroadcastTime > this.typingBroadcastInterval)) {
      this.lastTypingBroadcastTime = now;

      this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: this.userId,
          username: this.username,
          isTyping: isTyping,
          timestamp: now
        }
      }).catch(err => {
        console.error('[WebSocketBridge] Failed to broadcast typing event:', err);
      });
    }
  }

  /**
   * Gracefully updates the current user's presence status (e.g. online, away, offline) on the fly.
   */
  public async updatePresenceStatus(status: 'online' | 'away' | 'offline', customStatus?: string): Promise<void> {
    this.status = status;
    this.customStatus = customStatus;

    if (this.channel && this.channel.state === 'joined') {
      try {
        await this.channel.track({
          userId: this.userId,
          username: this.username,
          avatarUrl: this.avatarUrl,
          onlineAt: new Date().toISOString(),
          status: this.status,
          customStatus: this.customStatus,
        });
      } catch (err) {
        console.error('[WebSocketBridge] Failed to update presence tracking:', err);
      }
    }
  }

  /**
   * Clean up listeners, cancel timeouts, send a typing cessation broadcast, and unsubscribe.
   */
  public disconnect(): void {
    // Clear typing indicator decay timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    if (this.channel) {
      console.log(`[WebSocketBridge] Disconnecting channel...`);
      
      // Attempt to broadcast typing cessation before disconnecting
      if (this.isLocallyTyping) {
        try {
          this.channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              userId: this.userId,
              username: this.username,
              isTyping: false,
              timestamp: Date.now()
            }
          });
        } catch {
          // Ignore failures since we are closing anyway
        }
      }

      this.channel.unsubscribe().catch((err) => {
        console.error('[WebSocketBridge] Error while unsubscribing:', err);
      });
      this.channel = null;
    }

    this.isLocallyTyping = false;
    this.updateConnectionState('DISCONNECTED');
  }

  // --- PRIVATE EVENT HANDLERS ---

  private handleMessageReceived(message: Message): void {
    // Dispatch to callbacks
    if (this.onMessageReceived) {
      this.onMessageReceived(message);
    }
    
    // Dispatch directly to Zustand store if hooked up
    if (this.store && this.store.addMessage) {
      this.store.addMessage(message);
    }
  }

  private handlePresenceSync(): void {
    if (!this.channel) return;

    const state = this.channel.presenceState();
    const formattedPresence: Record<string, UserPresence[]> = {};

    // Transform Supabase Presence State to standard UserPresence structure
    Object.keys(state).forEach((key) => {
      const rawPresences = state[key];
      if (Array.isArray(rawPresences)) {
        formattedPresence[key] = rawPresences.map((pres: any, index) => ({
          presenceId: pres.presence_ref || `${key}-${index}`,
          userId: pres.userId || key,
          username: pres.username || 'Anonymous',
          avatarUrl: pres.avatarUrl,
          onlineAt: pres.onlineAt || new Date().toISOString(),
          status: pres.status || 'online',
          customStatus: pres.customStatus,
        }));
      }
    });

    console.log('[WebSocketBridge] Presence synched, current users online:', Object.keys(formattedPresence).length);

    if (this.onPresenceSync) {
      this.onPresenceSync(formattedPresence);
    }

    if (this.store && this.store.setOnlineUsers) {
      this.store.setOnlineUsers(formattedPresence);
    }
  }

  private handleTypingBroadcast(response: any): void {
    const payload = response.payload;
    if (!payload || typeof payload !== 'object') return;

    const { userId, username, isTyping, timestamp } = payload as {
      userId: string;
      username: string;
      isTyping: boolean;
      timestamp: number;
    };

    // Ignore self-typing broadcast events
    if (userId === this.userId) return;

    console.log(`[WebSocketBridge] Received typing broadcast. User: ${username} (${userId}), Typing: ${isTyping}`);

    // Manage decaying timers to automatically clear visual indicators if a client drops off abruptly
    if (this.typingTimeouts.has(userId)) {
      clearTimeout(this.typingTimeouts.get(userId)!);
      this.typingTimeouts.delete(userId);
    }

    if (isTyping) {
      // Trigger callback or state update
      this.dispatchTypingChange(userId, { userId, username, isTyping, timestamp });

      // Setup safety timeout to prune "stuck" typing states
      const timeout = setTimeout(() => {
        console.log(`[WebSocketBridge] Auto-clearing stuck typing indicator for user: ${username}`);
        this.dispatchTypingChange(userId, null);
        this.typingTimeouts.delete(userId);
      }, this.typingDecayTime);

      this.typingTimeouts.set(userId, timeout);
    } else {
      // User explicitly stopped typing
      this.dispatchTypingChange(userId, null);
    }
  }

  private dispatchTypingChange(userId: string, state: TypingIndicator | null): void {
    if (this.onTypingStatusChange) {
      this.onTypingStatusChange(userId, state);
    }

    if (this.store && this.store.setTypingUser) {
      this.store.setTypingUser(userId, state);
    }
  }

  private updateConnectionState(state: ConnectionState): void {
    console.log(`[WebSocketBridge] Connection state transition: ${state}`);

    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state);
    }

    if (this.store && this.store.setConnectionState) {
      this.store.setConnectionState(state);
    }
  }
}
