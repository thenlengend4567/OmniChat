"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, 
  Settings, 
  Mic, 
  MicOff, 
  Headphones, 
  Users, 
  Send, 
  Smile, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus, 
  Volume2, 
  Sparkles, 
  Bot, 
  Lock, 
  Compass, 
  Bell, 
  Pin,
  Search,
  MessageSquare,
  ShieldCheck,
  Command,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useChatStore, Message, Member, Server } from '../lib/chat-store';
import { useAuth } from '../lib/auth-context';

export default function ChatLayout() {
  const { user, signOut } = useAuth();
  const {
    servers,
    activeServerId,
    activeChannelId,
    members,
    messages,
    typingUsers,
    isServerSidebarCollapsed,
    isMemberDrawerOpen,
    currentUser,
    setActiveServer,
    setActiveChannel,
    sendMessage,
    addReaction,
    toggleServerSidebar,
    toggleMemberDrawer,
    updateMemberStatus
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Get active server & channel details
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];
  const activeChannel = activeServer.channels.find((c) => c.id === activeChannelId) || activeServer.channels[0];
  const currentChannelMessages = messages[activeChannelId] || [];
  const currentTypingIds = typingUsers[activeChannelId] || [];

  // Filtered messages based on search query
  const filteredMessages = currentChannelMessages.filter(msg => 
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll timeline to the bottom
  const scrollToBottom = () => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChannelMessages, currentTypingIds]);

  // Click outside listener for status menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(activeChannelId, inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
      case 'idle': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
      case 'dnd': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
      case 'offline': return 'bg-zinc-500';
      default: return 'bg-zinc-500';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickEmojis = ['🎉', '❤️', '🔥', '👍', '✨', '💯', '🚀', '👀'];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      
      {/* 1. COLLAPSIBLE SERVER NAVIGATION SIDEBAR (EXTREME LEFT RAIL) */}
      <aside className="z-20 flex flex-col items-center py-4 bg-[#050507] border-r border-[#151518] w-18 flex-shrink-0">
        {/* Brand Logo / Top Action */}
        <div className="mb-6 flex items-center justify-center">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 opacity-70 blur-md group-hover:opacity-100 transition duration-300"></div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 border border-brand-500/30">
              <Sparkles className="h-5 w-5 text-brand-400 group-hover:text-cyan-400 transition-colors" />
            </div>
            {/* Tooltip */}
            <span className="absolute left-16 top-3 scale-0 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 group-hover:scale-100 transition-all z-50 shadow-xl pointer-events-none whitespace-nowrap">
              OmniChat Swarm
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] w-8 bg-zinc-800/60 mb-4" />

        {/* Server List */}
        <div className="flex-1 w-full space-y-3 overflow-y-auto no-scrollbar flex flex-col items-center">
          {servers.map((srv) => {
            const isActive = srv.id === activeServerId;
            return (
              <div key={srv.id} className="relative group flex items-center justify-center w-full">
                {/* Active Indicator Glow Pill on the left */}
                <div 
                  className={`absolute left-0 w-[4px] rounded-r-full bg-white transition-all duration-300 ${
                    isActive 
                      ? 'h-8 opacity-100 shadow-[0_0_12px_rgba(255,255,255,0.8)]' 
                      : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-60'
                  }`} 
                />

                {/* Server Icon Circle */}
                <button
                  onClick={() => setActiveServer(srv.id)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 font-bold overflow-hidden ${
                    isActive 
                      ? 'rounded-2xl ' + srv.accentClass 
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:rounded-2xl hover:text-white ' + srv.accentClass
                  }`}
                  style={{
                    boxShadow: isActive ? '0 0 16px rgba(139, 92, 246, 0.25)' : 'none'
                  }}
                >
                  <span className="text-sm tracking-wider uppercase">{srv.icon}</span>
                </button>

                {/* Tooltip */}
                <span className="absolute left-16 scale-0 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 group-hover:scale-100 transition-all z-50 shadow-xl pointer-events-none whitespace-nowrap">
                  {srv.name}
                </span>
              </div>
            );
          })}

          {/* Plus Add Server Button */}
          <div className="relative group flex items-center justify-center w-full">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 border border-dashed border-zinc-800 text-zinc-600 hover:text-cyan-400 hover:border-cyan-400 hover:rounded-2xl transition-all duration-300">
              <Plus className="h-5 w-5" />
            </button>
            <span className="absolute left-16 scale-0 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap">
              Add Workstation
            </span>
          </div>
        </div>

        {/* Bottom Utility Profile */}
        <div className="mt-auto space-y-4 flex flex-col items-center">
          <div className="relative group">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-300">
              <Compass className="h-5 w-5" />
            </button>
            <span className="absolute left-16 scale-0 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap">
              Explore Channels
            </span>
          </div>
          <div className="relative group">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-300">
              <Settings className="h-5 w-5" />
            </button>
            <span className="absolute left-16 scale-0 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap">
              User Panel
            </span>
          </div>
        </div>
      </aside>

      {/* 2. CHANNELS SIDEBAR & SERVER HEADER */}
      <aside 
        className={`bg-[#0d0d10] border-r border-[#151518] flex flex-col flex-shrink-0 transition-all duration-300 ${
          isServerSidebarCollapsed ? 'w-0 overflow-hidden opacity-0 border-r-0' : 'w-60'
        }`}
      >
        {/* Active Server Header Card */}
        <div className="h-14 border-b border-[#151518] flex items-center justify-between px-4 bg-gradient-to-r from-[#0d0d10] to-[#121216] select-none">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse glow-indigo" />
            <h2 className="font-bold text-sm tracking-wide text-zinc-200 truncate">{activeServer.name}</h2>
          </div>
          <button 
            onClick={toggleServerSidebar} 
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-800/40 rounded transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Channel Navigation Body */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6 custom-scrollbar">
          {/* TEXT CHANNELS */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Text Channels</span>
              <button className="hover:text-zinc-300 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {activeServer.channels.map((chan) => {
                const isChanActive = chan.id === activeChannelId;
                return (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannel(chan.id)}
                    className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      isChanActive 
                        ? 'bg-zinc-800/60 text-white font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`h-4 w-4 flex-shrink-0 ${isChanActive ? 'text-brand-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                      <span className="truncate">{chan.name}</span>
                    </div>
                    {/* Glowing active badge indicator */}
                    {isChanActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400 glow-indigo animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* VOICE INTEGRATION MOCK */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Voice Channels</span>
              <button className="hover:text-zinc-300 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-400 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-zinc-600" />
                  <span>General Voice</span>
                </div>
                <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">Muted</span>
              </button>
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-400 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-zinc-600" />
                  <span>Dev Huddle 🎧</span>
                </div>
                <span className="text-[10px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/20">Empty</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. CURRENT USER BOTTOM PROFILE FOOTER */}
        <div className="h-16 border-t border-[#151518] bg-[#09090b] flex items-center justify-between px-3.5 relative">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status Avatar Dropdown Trigger */}
            <div className="relative cursor-pointer group" onClick={() => setShowStatusMenu(!showStatusMenu)}>
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="h-8.5 w-8.5 rounded-full border border-zinc-800 group-hover:border-zinc-500 transition-colors"
              />
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#09090b] ${getStatusColor(currentUser.status)}`} />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                {user?.email?.split('@')[0] || currentUser.name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate leading-tight">
                {user?.email || currentUser.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500">
            <button className="p-1.5 hover:bg-zinc-800/60 rounded-md hover:text-zinc-300 transition-all" title="Mute Microphone">
              <Mic className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 hover:bg-zinc-800/60 rounded-md hover:text-zinc-300 transition-all" title="Deafen Audio">
              <Headphones className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => signOut()}
              className="p-1.5 hover:bg-rose-950/40 rounded-md hover:text-rose-450 transition-all"
              title="Terminate Secure Session"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Real-time Status Selection Menu Popup */}
          {showStatusMenu && (
            <div 
              ref={statusMenuRef} 
              className="absolute bottom-18 left-2 w-48 rounded-xl bg-zinc-950 border border-zinc-800 p-1.5 shadow-2xl z-50 animate-subtle-float"
            >
              <div className="px-2 py-1 mb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Set your status</div>
              
              <button 
                onClick={() => { updateMemberStatus(currentUser.id, 'online'); setShowStatusMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 glow-emerald" />
                <span>Online</span>
              </button>
              
              <button 
                onClick={() => { updateMemberStatus(currentUser.id, 'idle'); setShowStatusMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Idle</span>
              </button>
              
              <button 
                onClick={() => { updateMemberStatus(currentUser.id, 'dnd'); setShowStatusMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Do Not Disturb</span>
              </button>
              
              <button 
                onClick={() => { updateMemberStatus(currentUser.id, 'offline'); setShowStatusMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
              >
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                <span>Invisible</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* RE-EXPAND SERVER BUTTON (WHEN COLLAPSED) */}
      {isServerSidebarCollapsed && (
        <button 
          onClick={toggleServerSidebar} 
          className="absolute left-2 top-4 z-40 h-8 w-8 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white shadow-xl hover:bg-zinc-800 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* 4. CENTRAL CHAT TIMELINE PANEL */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        {/* Central Chat Header */}
        <header className="h-14 border-b border-[#151518] flex items-center justify-between px-6 bg-gradient-to-b from-[#0e0e11] to-[#09090b] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="h-5 w-5 text-brand-400 flex-shrink-0" />
            <span className="font-bold text-sm text-zinc-200">{activeChannel.name}</span>
            <span className="hidden md:inline text-zinc-600 text-xs px-2 select-none">|</span>
            <span className="hidden md:inline text-xs text-zinc-400 truncate">{activeChannel.topic}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative hidden sm:flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search channel..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 md:w-56 bg-zinc-950/60 border border-zinc-800/70 rounded-full pl-8.5 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 text-zinc-500 hover:text-zinc-300">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Panel Toggles */}
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors" title="Pinned Messages">
              <Pin className="h-4.5 w-4.5" />
            </button>
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors" title="Notifications">
              <Bell className="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={toggleMemberDrawer} 
              className={`transition-colors ${isMemberDrawerOpen ? 'text-brand-400' : 'text-zinc-400 hover:text-zinc-200'}`}
              title="Toggle Members Panel"
            >
              <Users className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Message Scroll View */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.02),transparent_40%)]">
          
          {/* Welcome Splash Banner */}
          <div className="border border-zinc-800/40 bg-zinc-950/30 rounded-2xl p-6 mb-8 text-left max-w-2xl">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-4">
              <Hash className="h-5 w-5 text-brand-400" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Welcome to #{activeChannel.name}!</h1>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              This is the start of the #{activeChannel.name} channel. {activeChannel.topic}
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-1 rounded">Next.js App Router</span>
              <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded">Zustand State Store</span>
              <span className="text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-1 rounded">Cyberpunk Glow Accent</span>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center text-xs text-zinc-600 my-4 select-none">
            <div className="flex-1 h-[1px] bg-zinc-800/40" />
            <span className="px-3 uppercase tracking-widest text-[9px] font-bold">Timeline Feed</span>
            <div className="flex-1 h-[1px] bg-zinc-800/40" />
          </div>

          {/* If search query yielding nothing */}
          {filteredMessages.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <HelpCircle className="h-10 w-10 text-zinc-600 mb-2" />
              <p className="text-sm">No results matching "{searchQuery}"</p>
            </div>
          )}

          {/* Actual Messages List */}
          {filteredMessages.map((msg) => {
            const isSelf = msg.senderId === currentUser.id;
            return (
              <div 
                key={msg.id} 
                className="group relative flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-950/40 border border-transparent hover:border-zinc-900/60 transition-all duration-200"
              >
                {/* User Avatar */}
                <div className="relative flex-shrink-0">
                  <img src={msg.senderAvatar} alt={msg.senderName} className="h-10 w-10 rounded-xl object-cover border border-zinc-800/70" />
                  {msg.isBot && (
                    <span className="absolute -bottom-1 -right-1 bg-brand-500 text-white rounded-full p-0.5 scale-90 border border-[#09090b]">
                      <Bot className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>

                {/* Message Core Box */}
                <div className="flex-1 min-w-0">
                  {/* Author Line */}
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className={`text-sm font-bold truncate ${isSelf ? 'text-cyan-400' : 'text-zinc-200'}`}>
                      {msg.senderName}
                    </span>
                    {msg.senderRole && (
                      <span className="text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {msg.senderRole}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Bubble Content */}
                  <p className="text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-wrap select-text">
                    {msg.content}
                  </p>

                  {/* Reaction Pills */}
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {msg.reactions.map((r, i) => {
                        const hasReacted = r.users.includes(currentUser.id);
                        return (
                          <button
                            key={i}
                            onClick={() => addReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all border ${
                              hasReacted 
                                ? 'bg-brand-500/10 border-brand-500/40 text-brand-400 shadow-[0_0_8px_rgba(139,92,246,0.1)]' 
                                : 'bg-zinc-950/40 border-zinc-800/50 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-semibold text-[10px]">{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hover Message Action Menu (Reactions, etc.) */}
                <div className="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1 shadow-2xl">
                  {/* Show Reaction Picker Trigger */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveReactionPickerMessageId(activeReactionPickerMessageId === msg.id ? null : msg.id)}
                      className="p-1.5 hover:bg-zinc-900 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Add Reaction"
                    >
                      <Smile className="h-4 w-4" />
                    </button>

                    {/* Popup Reaction Picker */}
                    {activeReactionPickerMessageId === msg.id && (
                      <div className="absolute bottom-8 right-0 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 shadow-2xl flex gap-1 z-50 whitespace-nowrap">
                        {quickEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              addReaction(msg.id, emoji);
                              setActiveReactionPickerMessageId(null);
                            }}
                            className="hover:scale-125 p-1 text-base transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="p-1.5 hover:bg-zinc-900 rounded text-zinc-400 hover:text-zinc-200 transition-colors" title="Thread Reply">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator Bubble */}
          {currentTypingIds.length > 0 && (
            <div className="flex items-center gap-3 p-2 bg-zinc-950/30 border border-zinc-900/60 rounded-xl w-fit animate-pulse">
              <div className="flex gap-1 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 dot-typing" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 dot-typing" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 dot-typing" />
              </div>
              <span className="text-xs text-zinc-500">
                {currentTypingIds.map(id => members[id]?.name || 'Someone').join(', ')} is typing...
              </span>
            </div>
          )}

          {/* Dummy element for scrolling */}
          <div ref={timelineEndRef} />
        </div>

        {/* 5. CENTRAL TIMELINE BOTTOM CHAT INPUT BAR */}
        <div className="p-4 bg-[#09090b] border-t border-[#151518]">
          <form onSubmit={handleSendMessage} className="relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message #${activeChannel.name}...`}
              rows={1}
              className="w-full bg-[#0d0d10] border border-[#1d1d22] hover:border-zinc-800/80 focus:border-brand-500/80 focus:outline-none rounded-xl pl-4.5 pr-14 py-3.5 text-sm text-zinc-200 placeholder-zinc-500 focus:ring-1 focus:ring-brand-500/20 transition-all custom-scrollbar resize-none"
            />
            
            {/* Input Utilities */}
            <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
              <button 
                type="button" 
                className="p-1 hover:bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Add Emojis"
              >
                <Smile className="h-5 w-5" />
              </button>
              
              <button 
                type="submit"
                disabled={!inputMessage.trim()}
                className={`p-1 rounded transition-colors ${
                  inputMessage.trim() 
                    ? 'text-brand-400 hover:text-brand-300' 
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
                title="Send Message"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </form>

          {/* Status quick tip bar */}
          <div className="flex justify-between items-center px-1.5 mt-2 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>Press <kbd className="font-semibold text-zinc-400">Enter</kbd> to dispatch messaging packet.</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400/80" />
              <span>Fully reactive monorepo node</span>
            </div>
          </div>
        </div>
      </main>

      {/* 6. MEMBER LIST DRAWER (RIGHT SIDEBAR) */}
      <aside 
        className={`bg-[#0d0d10] border-l border-[#151518] flex flex-col flex-shrink-0 transition-all duration-300 ${
          isMemberDrawerOpen ? 'w-60' : 'w-0 overflow-hidden opacity-0 border-l-0'
        }`}
      >
        <div className="h-14 border-b border-[#151518] flex items-center justify-between px-4 bg-gradient-to-l from-[#0d0d10] to-[#121216] select-none">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400" />
            <h2 className="font-bold text-sm tracking-wide text-zinc-200">Active Node</h2>
            <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {Object.keys(members).length}
            </span>
          </div>
          <button 
            onClick={toggleMemberDrawer} 
            className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-800/40 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Members Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar select-none">
          {/* ONLINE & IDLE MEMBERS CATEGORY */}
          <div>
            <h3 className="px-2 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Available Units
            </h3>
            
            <div className="space-y-1">
              {Object.values(members)
                .filter(m => m.status !== 'offline')
                .map((member) => (
                  <div 
                    key={member.id} 
                    className="flex flex-col p-2 rounded-lg hover:bg-zinc-900/60 border border-transparent hover:border-zinc-850/50 transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Member Avatar with status badge */}
                      <div className="relative flex-shrink-0">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          className="h-8 w-8 rounded-full border border-zinc-800 object-cover" 
                        />
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d10] ${getStatusColor(member.status)}`} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`text-xs font-semibold truncate ${member.id === currentUser.id ? 'text-cyan-400' : 'text-zinc-300'}`}>
                            {member.name}
                          </span>
                          {member.isBot && (
                            <span className="bg-brand-500/10 text-brand-400 text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border border-brand-500/20">
                              Bot
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-500 truncate">{member.role}</span>
                      </div>
                    </div>

                    {/* Expandable Custom Status Row */}
                    {member.customStatus && (
                      <div className="mt-1.5 pl-10 text-[10px] text-zinc-400 italic truncate group-hover:whitespace-normal group-hover:break-words transition-all">
                        "{member.customStatus}"
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* OFFLINE MEMBERS CATEGORY */}
          <div>
            <h3 className="px-2 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Offline Nodes
            </h3>
            
            <div className="space-y-1">
              {Object.values(members)
                .filter(m => m.status === 'offline')
                .map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-2.5 p-2 rounded-lg opacity-40 hover:opacity-100 hover:bg-zinc-900/30 transition-all duration-200 cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="h-8 w-8 rounded-full border border-zinc-900 grayscale object-cover" 
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d10] bg-zinc-600" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-400 truncate">{member.name}</span>
                      <span className="text-[9px] text-zinc-500 truncate">{member.role}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Quick monorepo telemetry info footer */}
        <div className="p-3 border-t border-[#151518] bg-[#09090b] flex flex-col gap-1 text-[9px] text-zinc-600">
          <div className="flex justify-between">
            <span>Latent Sync:</span>
            <span className="text-emerald-500 font-mono">0.4ms</span>
          </div>
          <div className="flex justify-between">
            <span>Active Agent:</span>
            <span className="text-brand-400">swarm-agent-v4</span>
          </div>
        </div>
      </aside>

    </div>
  );
}
