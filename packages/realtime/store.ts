import { create } from 'zustand';
import { Message, UserPresence, TypingIndicator, ConnectionState, RealtimeStore } from './websocket-bridge.js';

export interface ChatStoreState extends RealtimeStore {
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
}

/**
 * A production-grade Zustand store for managing chat states.
 * Connects directly to the WebSocketBridge to trigger reactive UI updates.
 */
export const useChatStore = create<ChatStoreState>((set) => ({
  messages: [],
  onlineUsers: {},
  typingUsers: {},
  connectionState: 'DISCONNECTED',

  /**
   * Appends a message to the store, preventing duplicates.
   */
  addMessage: (message) =>
    set((state) => {
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return {};
      
      // Sort messages by creation date to guarantee chronological rendering
      const updatedMessages = [...state.messages, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      return { messages: updatedMessages };
    }),

  /**
   * Initializes or replaces the message history (e.g., after initial database fetch).
   */
  setMessages: (messages) =>
    set({
      messages: [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }),

  /**
   * Clears the messaging history (e.g., when logging out or switching rooms).
   */
  clearMessages: () => set({ messages: [] }),

  /**
   * Sets the collection of online users tracked by Presence.
   */
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  /**
   * Adds or removes a user's active typing state.
   */
  setTypingUser: (userId, typingState) =>
    set((state) => {
      const nextTyping = { ...state.typingUsers };
      if (typingState === null) {
        delete nextTyping[userId];
      } else {
        nextTyping[userId] = typingState;
      }
      return { typingUsers: nextTyping };
    }),

  /**
   * Updates the global WebSocket connection status.
   */
  setConnectionState: (connectionState) => set({ connectionState }),
}));
