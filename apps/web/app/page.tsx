"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

// Dynamically import ChatLayout to achieve code-splitting and reduce initial bundle size.
// The custom loading component is a high-fidelity representation of the main chat screen,
// ensuring a premium user experience and zero Cumulative Layout Shift (CLS).
const ChatLayout = dynamic(() => import("../components/ChatLayout"), {
  ssr: false,
  loading: () => <ChatWorkspaceSkeleton />,
});

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <ChatWorkspaceSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5] select-none">
      <ChatLayout />
    </main>
  );
}

// A state-of-the-art skeleton layout matching the core OmniChat grid.
function ChatWorkspaceSkeleton() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] animate-pulse">
      {/* 1. Left Server Rail Skeleton */}
      <aside className="flex flex-col items-center py-4 bg-[#050507] border-r border-[#151518] w-18 shrink-0 space-y-4">
        <div className="w-10 h-10 rounded-full bg-zinc-800/40"></div>
        <div className="h-[1px] w-8 bg-zinc-850"></div>
        <div className="w-10 h-10 rounded-2xl bg-zinc-800/20"></div>
        <div className="w-10 h-10 rounded-full bg-zinc-800/20"></div>
        <div className="w-10 h-10 rounded-full bg-zinc-800/20"></div>
        <div className="mt-auto space-y-4">
          <div className="w-8 h-8 rounded-full bg-zinc-800/30"></div>
          <div className="w-8 h-8 rounded-full bg-zinc-800/30"></div>
        </div>
      </aside>

      {/* 2. Channels Sidebar Skeleton */}
      <aside className="w-60 bg-[#0d0d10] border-r border-[#151518] flex flex-col shrink-0">
        <div className="h-14 border-b border-[#151518] flex items-center px-4">
          <div className="h-4 bg-zinc-800/60 rounded w-2/3"></div>
        </div>
        <div className="flex-1 p-4 space-y-6">
          <div className="space-y-3">
            <div className="h-3 bg-zinc-850 rounded w-1/3"></div>
            <div className="h-8 bg-zinc-800/30 rounded-lg w-full"></div>
            <div className="h-8 bg-zinc-800/10 rounded-lg w-full"></div>
            <div className="h-8 bg-zinc-800/10 rounded-lg w-full"></div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-zinc-850 rounded w-1/2"></div>
            <div className="h-8 bg-zinc-800/10 rounded-lg w-full"></div>
            <div className="h-8 bg-zinc-800/10 rounded-lg w-full"></div>
          </div>
        </div>
        <div className="h-16 border-t border-[#151518] bg-[#09090b] flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800/50"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-zinc-800/60 rounded w-3/4"></div>
            <div className="h-2 bg-zinc-800/30 rounded w-1/2"></div>
          </div>
        </div>
      </aside>

      {/* 3. Central Chat Timeline Skeleton */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {/* Header */}
        <header className="h-14 border-b border-[#151518] flex items-center justify-between px-6 bg-[#09090b]">
          <div className="flex items-center gap-3 w-1/3">
            <div className="h-5 bg-zinc-800/50 rounded w-5 shrink-0"></div>
            <div className="h-4 bg-zinc-800/40 rounded w-24"></div>
            <div className="h-3 bg-zinc-800/20 rounded w-40"></div>
          </div>
          <div className="w-48 h-8 bg-zinc-900/60 rounded-full"></div>
        </header>

        {/* Timeline Messages List */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/40 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 bg-zinc-850 rounded w-28"></div>
                  <div className="h-2 bg-zinc-850 rounded w-12"></div>
                </div>
                <div className="h-5 bg-zinc-800/30 rounded-lg w-5/6"></div>
                {idx === 0 && <div className="h-5 bg-zinc-800/20 rounded-lg w-2/3"></div>}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-[#09090b] border-t border-[#151518]">
          <div className="w-full h-12 bg-[#0d0d10] border border-[#1d1d22] rounded-xl"></div>
        </div>
      </main>

      {/* 4. Right Member Drawer Skeleton */}
      <aside className="w-60 bg-[#0d0d10] border-l border-[#151518] flex flex-col shrink-0">
        <div className="h-14 border-b border-[#151518] flex items-center px-4 justify-between">
          <div className="h-4 bg-zinc-800/60 rounded w-1/3"></div>
          <div className="w-4 h-4 bg-zinc-800/40 rounded"></div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="h-3 bg-zinc-850 rounded w-1/2 mb-4"></div>
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800/30"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-zinc-800/40 rounded w-2/3"></div>
                <div className="h-2 bg-zinc-800/20 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
