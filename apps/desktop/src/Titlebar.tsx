import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, MessageSquareCode } from 'lucide-react';

// Elite dynamic loader for Tauri v1 vs v2 compatibility
let appWindow: any = null;

const initTauriWindow = async () => {
  if (appWindow) return appWindow;
  try {
    const windowModule = await import('@tauri-apps/api/window');
    if ('getCurrentWindow' in windowModule) {
      // Tauri v2 API
      appWindow = (windowModule as any).getCurrentWindow();
    } else if ('appWindow' in windowModule) {
      // Tauri v1 API
      appWindow = (windowModule as any).appWindow;
    }
  } catch (err) {
    console.warn('[Titlebar] Tauri window module not loaded. Running in standard web context fallback.');
  }
  return appWindow;
};

export const Titlebar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasTauri, setHasTauri] = useState(false);

  // Sync maximization state on launch and on window resize events
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupWindowListeners = async () => {
      const win = await initTauriWindow();
      if (!win) return;
      setHasTauri(true);

      try {
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);

        // Listen to resize events to update the maximize/restore icon dynamically
        unlistenFn = await win.onResized(async () => {
          const max = await win.isMaximized();
          setIsMaximized(max);
        });
      } catch (err) {
        console.error('[Titlebar] Failed to initialize window events:', err);
      }
    };

    setupWindowListeners();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const win = await initTauriWindow();
      if (win) {
        await win.minimize();
      } else {
        console.log('[Titlebar] Minimize command ignored (running in browser)');
      }
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  };

  const handleMaximizeToggle = async () => {
    try {
      const win = await initTauriWindow();
      if (win) {
        const maximized = await win.isMaximized();
        if (maximized) {
          await win.unmaximize();
          setIsMaximized(false);
        } else {
          await win.maximize();
          setIsMaximized(true);
        }
      } else {
        console.log('[Titlebar] Maximize command ignored (running in browser)');
      }
    } catch (err) {
      console.error('Failed to toggle maximize state:', err);
    }
  };

  const handleClose = async () => {
    try {
      const win = await initTauriWindow();
      if (win) {
        await win.close();
      } else {
        console.log('[Titlebar] Close command ignored (running in browser)');
      }
    } catch (err) {
      console.error('Failed to close window:', err);
    }
  };

  return (
    <div
      className="select-none h-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/20 text-slate-200 z-50 fixed top-0 left-0 right-0"
      data-tauri-drag-region
      style={{
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Brand & Logo Area */}
      <div 
        className="flex items-center gap-2 pl-3 pointer-events-none" 
        data-tauri-drag-region
      >
        <div className="w-5 h-5 flex items-center justify-center bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-md shadow-[0_0_10px_rgba(6,182,212,0.4)]">
          <MessageSquareCode className="w-3.5 h-3.5 text-white" />
        </div>
        <span 
          className="text-xs font-semibold tracking-wider text-cyan-400 bg-clip-text"
          data-tauri-drag-region
        >
          OMNICHAT
        </span>
        <span 
          className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/50"
          data-tauri-drag-region
        >
          DESKTOP
        </span>
      </div>

      {/* Center Draggable Spacer */}
      <div 
        className="flex-1 h-full flex items-center justify-center text-[11px] text-slate-400 font-medium"
        data-tauri-drag-region
      >
        OmniChat Secure Sync Environment
      </div>

      {/* Windows Style Native Window Controls */}
      <div className="flex items-center h-full">
        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-11 h-full transition-colors hover:bg-slate-800/80 active:bg-slate-700/80 group"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-100 transition-colors" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          onClick={handleMaximizeToggle}
          className="flex items-center justify-center w-11 h-full transition-colors hover:bg-slate-800/80 active:bg-slate-700/80 group"
          title={isMaximized ? 'Restore Down' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-100 transition-colors transform rotate-180" />
          ) : (
            <Square className="w-3 h-3 text-slate-400 group-hover:text-slate-100 transition-colors" />
          )}
        </button>

        {/* Close Button - Windows style deep red hover */}
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-11 h-full transition-colors hover:bg-red-600 active:bg-red-700 group"
          title="Close"
        >
          <X className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
};
