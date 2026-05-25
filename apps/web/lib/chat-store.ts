import { create } from 'zustand';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  isBot?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // memberIds
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  isBot?: boolean;
  content: string;
  timestamp: string;
  reactions: Reaction[];
}

export interface Channel {
  id: string;
  name: string;
  topic: string;
  unread?: boolean;
  mentionCount?: number;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  accentClass: string;
  glowClass: string;
  channels: Channel[];
}

interface ChatState {
  // Navigation State
  servers: Server[];
  activeServerId: string;
  activeChannelId: string;
  
  // Members State
  members: Record<string, Member>;
  
  // Messages State
  messages: Record<string, Message[]>; // channelId -> Message[]
  
  // Typing indicators
  typingUsers: Record<string, string[]>; // channelId -> userIds
  
  // UI State
  isServerSidebarCollapsed: boolean;
  isMemberDrawerOpen: boolean;
  currentUser: Member;

  // Actions
  setActiveServer: (serverId: string) => void;
  setActiveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  setTypingStatus: (channelId: string, userId: string, isTyping: boolean) => void;
  toggleServerSidebar: () => void;
  toggleMemberDrawer: () => void;
  updateMemberStatus: (userId: string, status: Member['status']) => void;
  
  // Interactive Live simulation
  simulateTypingAndReply: (channelId: string, text: string) => void;
}

const INITIAL_MEMBERS: Record<string, Member> = {
  'user-1': {
    id: 'user-1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Lead Designer',
    status: 'online',
    customStatus: 'Crafting pixel perfection ✨',
  },
  'user-2': {
    id: 'user-2',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Backend Architect',
    status: 'dnd',
    customStatus: 'In the zone | Do Not Disturb 🖥️',
  },
  'user-3': {
    id: 'user-3',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Frontend Dev',
    status: 'idle',
    customStatus: 'Next.js App Router is amazing 🚀',
  },
  'user-4': {
    id: 'user-4',
    name: 'OmniBot',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'AI System Assistant',
    status: 'online',
    customStatus: 'Here to help you build fast 🤖',
    isBot: true,
  },
  'user-current': {
    id: 'user-current',
    name: 'Alex Mercer (You)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Staff Engineer',
    status: 'online',
    customStatus: 'Wiring up Zustand state stores 🛠️',
  }
};

const INITIAL_SERVERS: Server[] = [
  {
    id: 'srv-omnichat',
    name: 'OmniChat HQ',
    icon: 'OC',
    accentClass: 'bg-brand-500 hover:bg-brand-600 text-white',
    glowClass: 'group-hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] border-brand-500',
    channels: [
      { id: 'ch-announcements', name: 'announcements', topic: 'Official announcements and server updates.' },
      { id: 'ch-general', name: 'general-chat', topic: 'The digital watercooler for general discussion.' },
      { id: 'ch-features', name: 'feature-requests', topic: 'Pitch and discuss high-fidelity components.' },
    ]
  },
  {
    id: 'srv-dev',
    name: 'Dev Lab',
    icon: '💻',
    accentClass: 'bg-cyan-500 hover:bg-cyan-600 text-black',
    glowClass: 'group-hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] border-cyan-500',
    channels: [
      { id: 'ch-nextjs', name: 'nextjs-app-router', topic: 'Deep diving into React Server Components and nested layouts.' },
      { id: 'ch-zustand', name: 'zustand-magic', topic: 'Uncompromisingly simple global state management.' },
      { id: 'ch-bugs', name: 'bugs-and-fixes', topic: 'Ironing out compilation logs and hydration mismatches.' }
    ]
  },
  {
    id: 'srv-gaming',
    name: 'Arcade Room',
    icon: '🎮',
    accentClass: 'bg-emerald-500 hover:bg-emerald-600 text-black',
    glowClass: 'group-hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] border-emerald-500',
    channels: [
      { id: 'ch-lfg', name: 'looking-for-group', topic: 'Squad up for high-intensity matches.' },
      { id: 'ch-clips', name: 'clip-share', topic: 'Showcase your finest competitive achievements.' }
    ]
  },
  {
    id: 'srv-design',
    name: 'Pixel Perfect',
    icon: '🎨',
    accentClass: 'bg-pink-500 hover:bg-pink-600 text-white',
    glowClass: 'group-hover:shadow-[0_0_15px_rgba(236,72,153,0.6)] border-pink-500',
    channels: [
      { id: 'ch-inspiration', name: 'inspiration', topic: 'Dribbble, Behance, and aesthetic design moodboards.' },
      { id: 'ch-critiques', name: 'ui-ux-feedback', topic: 'Constructive feedback on live wireframes and high-fidelity mockups.' }
    ]
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'ch-announcements': [
    {
      id: 'msg-1',
      channelId: 'ch-announcements',
      senderId: 'user-4',
      senderName: 'OmniBot',
      senderAvatar: INITIAL_MEMBERS['user-4'].avatar,
      senderRole: 'AI System Assistant',
      isBot: true,
      content: 'Welcome to the brand new OmniChat Workspace! 🚀 This interface is powered by Next.js App Router, Tailwind CSS, and Zustand. Experience fluid animations, premium glassmorphic styling, and fully reactive components.',
      timestamp: '2026-05-25T10:00:00Z',
      reactions: [
        { emoji: '🎉', count: 4, users: ['user-1', 'user-2', 'user-3', 'user-current'] },
        { emoji: '🔥', count: 3, users: ['user-1', 'user-2', 'user-current'] }
      ]
    }
  ],
  'ch-general': [
    {
      id: 'msg-2',
      channelId: 'ch-general',
      senderId: 'user-3',
      senderName: 'Elena Rostova',
      senderAvatar: INITIAL_MEMBERS['user-3'].avatar,
      senderRole: 'Frontend Dev',
      content: 'Has anyone seen the animations we set up with Framer Motion? They make the sidebar expansion feel exceptionally premium!',
      timestamp: '2026-05-25T11:15:00Z',
      reactions: [{ emoji: '✨', count: 2, users: ['user-1', 'user-current'] }]
    },
    {
      id: 'msg-3',
      channelId: 'ch-general',
      senderId: 'user-1',
      senderName: 'Sarah Chen',
      senderAvatar: INITIAL_MEMBERS['user-1'].avatar,
      senderRole: 'Lead Designer',
      content: 'Absolutely loving it! The neon glow indicators on the active channels give a distinct cyber-aesthetic. Extremely beautiful job.',
      timestamp: '2026-05-25T11:18:00Z',
      reactions: [{ emoji: '❤️', count: 2, users: ['user-3', 'user-current'] }]
    },
    {
      id: 'msg-4',
      channelId: 'ch-general',
      senderId: 'user-2',
      senderName: 'Marcus Vance',
      senderAvatar: INITIAL_MEMBERS['user-2'].avatar,
      senderRole: 'Backend Architect',
      content: 'Database Sync and WS state are scaling seamlessly in the background too. Excellent framework choices.',
      timestamp: '2026-05-25T11:22:00Z',
      reactions: [{ emoji: '👍', count: 1, users: ['user-3'] }]
    }
  ],
  'ch-nextjs': [
    {
      id: 'msg-5',
      channelId: 'ch-nextjs',
      senderId: 'user-3',
      senderName: 'Elena Rostova',
      senderAvatar: INITIAL_MEMBERS['user-3'].avatar,
      senderRole: 'Frontend Dev',
      content: 'Next.js 14 App Router layout hierarchies allow us to preserve the sidebar states perfectly across sub-pages! No unnecessary re-renders.',
      timestamp: '2026-05-25T12:05:00Z',
      reactions: [{ emoji: '💯', count: 3, users: ['user-1', 'user-2', 'user-current'] }]
    }
  ],
  'ch-zustand': [
    {
      id: 'msg-6',
      channelId: 'ch-zustand',
      senderId: 'user-2',
      senderName: 'Marcus Vance',
      senderAvatar: INITIAL_MEMBERS['user-2'].avatar,
      senderRole: 'Backend Architect',
      content: 'Zustand is fantastic. It handles the active channels, typing states, and multi-member lists without the boilerplate of Redux or the context-hell of React Context API.',
      timestamp: '2026-05-25T12:30:00Z',
      reactions: [{ emoji: '🧠', count: 2, users: ['user-3', 'user-current'] }]
    }
  ]
};

export const useChatStore = create<ChatState>((set, get) => ({
  servers: INITIAL_SERVERS,
  activeServerId: 'srv-omnichat',
  activeChannelId: 'ch-general',
  
  members: INITIAL_MEMBERS,
  messages: INITIAL_MESSAGES,
  typingUsers: {},
  
  isServerSidebarCollapsed: false,
  isMemberDrawerOpen: true,
  currentUser: INITIAL_MEMBERS['user-current'],

  setActiveServer: (serverId) => {
    const server = get().servers.find(s => s.id === serverId);
    if (server && server.channels.length > 0) {
      set({ 
        activeServerId: serverId,
        activeChannelId: server.channels[0].id 
      });
    } else {
      set({ activeServerId: serverId });
    }
  },
  
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  
  sendMessage: (channelId, content) => {
    if (!content.trim()) return;
    
    const currentUser = get().currentUser;
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: currentUser.role,
      content,
      timestamp: new Date().toISOString(),
      reactions: []
    };

    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: [...channelMessages, newMessage]
        }
      };
    });

    // Auto trigger a bot reply simulation after 1-2 seconds for fun!
    if (content.toLowerCase().includes('bot') || content.toLowerCase().includes('hello') || content.toLowerCase().includes('setup') || Math.random() < 0.3) {
      setTimeout(() => {
        get().simulateTypingAndReply(channelId, content);
      }, 1500);
    }
  },
  
  addReaction: (messageId, emoji) => {
    const activeChannelId = get().activeChannelId;
    const currentUser = get().currentUser;
    
    set((state) => {
      const channelMessages = state.messages[activeChannelId] || [];
      const updatedMessages = channelMessages.map((msg) => {
        if (msg.id !== messageId) return msg;
        
        const existingReaction = msg.reactions.find((r) => r.emoji === emoji);
        let updatedReactions = [...msg.reactions];
        
        if (existingReaction) {
          const userIndex = existingReaction.users.indexOf(currentUser.id);
          if (userIndex > -1) {
            // Remove user's reaction
            const newUsers = existingReaction.users.filter(id => id !== currentUser.id);
            if (newUsers.length === 0) {
              updatedReactions = updatedReactions.filter(r => r.emoji !== emoji);
            } else {
              updatedReactions = updatedReactions.map(r => 
                r.emoji === emoji ? { ...r, count: r.count - 1, users: newUsers } : r
              );
            }
          } else {
            // Add user's reaction to existing
            updatedReactions = updatedReactions.map(r => 
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] } : r
            );
          }
        } else {
          // Add brand new emoji reaction
          updatedReactions.push({
            emoji,
            count: 1,
            users: [currentUser.id]
          });
        }
        
        return { ...msg, reactions: updatedReactions };
      });
      
      return {
        messages: {
          ...state.messages,
          [activeChannelId]: updatedMessages
        }
      };
    });
  },
  
  setTypingStatus: (channelId, userId, isTyping) => {
    set((state) => {
      const typing = state.typingUsers[channelId] || [];
      const isAlreadyTyping = typing.includes(userId);
      
      let updatedTyping = [...typing];
      if (isTyping && !isAlreadyTyping) {
        updatedTyping.push(userId);
      } else if (!isTyping && isAlreadyTyping) {
        updatedTyping = updatedTyping.filter((id) => id !== userId);
      }
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: updatedTyping
        }
      };
    });
  },
  
  toggleServerSidebar: () => set((state) => ({ isServerSidebarCollapsed: !state.isServerSidebarCollapsed })),
  
  toggleMemberDrawer: () => set((state) => ({ isMemberDrawerOpen: !state.isMemberDrawerOpen })),
  
  updateMemberStatus: (userId, status) => {
    set((state) => {
      const member = state.members[userId];
      if (!member) return {};
      
      return {
        members: {
          ...state.members,
          [userId]: { ...member, status }
        }
      };
    });
  },
  
  simulateTypingAndReply: (channelId, userMessageText) => {
    const bots = Object.values(get().members).filter(m => m.id !== 'user-current');
    const selectedBot = bots[Math.floor(Math.random() * bots.length)];
    
    // 1. Show Typing
    get().setTypingStatus(channelId, selectedBot.id, true);
    
    setTimeout(() => {
      // 2. Hide Typing
      get().setTypingStatus(channelId, selectedBot.id, false);
      
      // 3. Craft response based on name/role
      let reply = '';
      if (selectedBot.isBot) {
        reply = `Hello! I am OmniBot. I noticed you wrote: "${userMessageText}". I'm built entirely using Zustand reactivity! Everything on this dashboard compiles perfectly.`;
      } else if (selectedBot.id === 'user-1') {
        reply = `That makes perfect sense. Let me mock up some glassmorphism Figma styles matching "${userMessageText.slice(0, 15)}...". The cyber-glow highlights look superb!`;
      } else if (selectedBot.id === 'user-2') {
        reply = `Interesting. From a systems perspective, managing that client-side through this exact Zustand store yields super-low latency. Let's make sure it handles load correctly.`;
      } else {
        reply = `I agree! Testing out the responsiveness now. The interactive layout is scaling flawlessly on all screen widths! ✨`;
      }
      
      const newBotMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        senderId: selectedBot.id,
        senderName: selectedBot.name,
        senderAvatar: selectedBot.avatar,
        senderRole: selectedBot.role,
        isBot: selectedBot.isBot,
        content: reply,
        timestamp: new Date().toISOString(),
        reactions: []
      };
      
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        return {
          messages: {
            ...state.messages,
            [channelId]: [...channelMessages, newBotMessage]
          }
        };
      });
      
    }, 2000 + Math.random() * 1500);
  }
}));
