import React, { useEffect, useState } from 'react';
import { Titlebar } from './Titlebar';
import {
  syncSessionFromWebview,
  restoreSessionToWebview,
  clearSession,
  setupSessionSyncObserver,
  SessionData,
  getCookies,
} from './sync-session';
import { showMessageNotification, flashWindow, checkAndRequestPermissions } from './notifications';
import {
  Key,
  Mail,
  User,
  ShieldCheck,
  BellRing,
  Send,
  LogOut,
  RefreshCw,
  Cookie,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

export const App: React.FC = () => {
  // Session states
  const [session, setSession] = useState<SessionData | null>(null);
  const [cookiesList, setCookiesList] = useState<string[]>([]);
  const [loginEmail, setLoginEmail] = useState('demo-user@omnichat.dev');
  const [loginToken, setLoginToken] = useState('jwt_secure_session_token_xyz123');
  const [loginUserId, setLoginUserId] = useState('usr_98a7c6b5');
  const [syncStatus, setSyncStatus] = useState<string>('Idle');

  // Notification simulator states
  const [mockSender, setMockSender] = useState('Sarah Jenkins');
  const [mockMessage, setMockMessage] = useState('Hey team, the production deploy is live! 🚀');
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Sync cookies display list
  const refreshCookies = () => {
    const cookiesDict = getCookies();
    setCookiesList(Object.entries(cookiesDict).map(([k, v]) => `${k}=${v}`));
  };

  // On App Launch, restore session and listen for updates
  useEffect(() => {
    // 1. Check and request notification permissions
    checkAndRequestPermissions().then((granted) => {
      setPermissionGranted(granted);
    });

    // 2. Restore session from Rust local storage
    const loadSession = async () => {
      setSyncStatus('Restoring from Disk...');
      const restored = await restoreSessionToWebview();
      if (restored) {
        setSession(restored);
        setSyncStatus('Restored & Synchronized');
      } else {
        setSyncStatus('No saved session found');
      }
      refreshCookies();
    };
    loadSession();

    // 3. Initialize custom events for cross-context auth changes
    const onAuthRestored = (e: Event) => {
      const data = (e as CustomEvent).detail as SessionData;
      setSession(data);
      setSyncStatus('Synchronized');
      refreshCookies();
    };

    const onAuthCleared = () => {
      setSession(null);
      setSyncStatus('Session Cleared');
      setCookiesList([]);
    };

    window.addEventListener('auth-restored', onAuthRestored);
    window.addEventListener('auth-cleared', onAuthCleared);

    // 4. Start active background observer for session changes
    const stopObserver = setupSessionSyncObserver();

    return () => {
      window.removeEventListener('auth-restored', onAuthRestored);
      window.removeEventListener('auth-cleared', onAuthCleared);
      stopObserver();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSyncStatus('Synchronizing...');
      
      // Save credentials locally first to simulate webview login event
      localStorage.setItem('omnichat_auth_token', loginToken);
      localStorage.setItem('omnichat_user_id', loginUserId);
      localStorage.setItem('omnichat_user_email', loginEmail);
      
      // Write mock session cookies
      document.cookie = `session-id=${encodeURIComponent('sess_cookie_998877')}; Max-Age=86400; Path=/; SameSite=Lax`;
      document.cookie = `auth-provider=supabase; Max-Age=86400; Path=/; SameSite=Lax`;

      // Trigger sync logic
      const success = await syncSessionFromWebview();
      
      if (success) {
        setSession({
          token: loginToken,
          user_id: loginUserId,
          email: loginEmail,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          cookies: [`session-id=sess_cookie_998877`, `auth-provider=supabase`],
        });
        setSyncStatus('Synchronized');
        refreshCookies();
      } else {
        setSyncStatus('Sync Failed');
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('Sync Error');
    }
  };

  const handleLogout = async () => {
    try {
      setSyncStatus('Clearing...');
      await clearSession();
    } catch (err) {
      console.error(err);
    }
  };

  const triggerNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockSender || !mockMessage) return;

    // Fire native toast notification
    await showMessageNotification({
      title: 'New OmniChat Message',
      body: mockMessage,
      senderName: mockSender,
    });

    // Flash native window taskbar if not in focus
    await flashWindow();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col pt-10 select-none overflow-hidden relative">
      {/* Background Decorative Neon Gradients */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Draggable borderless custom Titlebar */}
      <Titlebar />

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {/* App Header */}
        <div className="text-center my-6 max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            OmniChat Sync Control Hub
          </h1>
          <p className="text-slate-400 text-xs mt-2 font-light leading-relaxed">
            Real-time hybrid synchronization. Manages background secure session keys, active webview cookies, and native Windows notifications inside a borderless glass viewport.
          </p>
        </div>

        {/* Dash Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-2">
          {/* LEFT PANEL: AUTH & SESSION SYNC */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-sm tracking-wider text-cyan-300">SESSION SYNC LAYER</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {syncStatus}
                </div>
              </div>

              {!session ? (
                /* Login Sync Simulator */
                <form onSubmit={handleLogin} className="space-y-3.5 mt-4">
                  <div className="text-xs text-slate-400 leading-normal">
                    Simulate logging into OmniChat webview. Credentials will be securely synced to the native OS keyring/disk config via IPC.
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Email Context</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">User ID</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={loginUserId}
                        onChange={(e) => setLoginUserId(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">JWT Security Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={loginToken}
                        onChange={(e) => setLoginToken(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <UserCheck className="w-4 h-4" />
                    Login & Sync Session to Desktop
                  </button>
                </form>
              ) : (
                /* Active Synced Session Panel */
                <div className="mt-4 space-y-4">
                  <div className="p-3.5 bg-slate-950/70 border border-cyan-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Secure Native Session Active
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                      <div><span className="text-slate-600 uppercase font-bold mr-1">User:</span> {session.email}</div>
                      <div><span className="text-slate-600 uppercase font-bold mr-1">UID:</span> {session.user_id}</div>
                      <div className="truncate"><span className="text-slate-600 uppercase font-bold mr-1">JWT:</span> {session.token.substring(0, 24)}...</div>
                    </div>
                  </div>

                  {/* Sync Cookies list */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                        <Cookie className="w-3.5 h-3.5 text-amber-500" />
						WebView Cookies Sync
                      </span>
                      <button 
                        onClick={refreshCookies} 
                        className="text-slate-500 hover:text-cyan-400 transition-colors"
                        title="Reload cookies"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="max-h-20 overflow-y-auto bg-slate-950/40 p-2 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1 text-slate-400">
                      {cookiesList.length > 0 ? (
                        cookiesList.map((c, i) => (
                          <div key={i} className="truncate bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800/40">{c}</div>
                        ))
                      ) : (
                        <div className="text-slate-600 italic">No credentials cookie saved.</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-slate-950/80 hover:bg-red-950/40 hover:text-red-300 border border-slate-800 hover:border-red-900 text-slate-300 font-medium py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout (Clear Storage & Keys)
                  </button>
                </div>
              )}
            </div>
            
            <div className="text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-800/40 text-center">
              Storage IPC protocol: GET_SESSION | SYNC_SESSION | CLEAR_SESSION
            </div>
          </div>

          {/* RIGHT PANEL: NATIVE DESKTOP NOTIFICATIONS */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-sm tracking-wider text-indigo-300">NATIVE NOTIFICATIONS</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${permissionGranted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {permissionGranted ? 'Granted' : 'Needs Request'}
                </div>
              </div>

              <form onSubmit={triggerNotification} className="space-y-3.5 mt-4">
                <div className="text-xs text-slate-400 leading-normal">
                  Simulate receiving real-time messaging updates. Dispatch native toast alerts to the Windows Action Center, and flash the taskbar when unfocused.
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Message Sender</label>
                  <input
                    type="text"
                    value={mockSender}
                    onChange={(e) => setMockSender(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Incoming Message Body</label>
                  <textarea
                    value={mockMessage}
                    onChange={(e) => setMockMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-light resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  Receive & Notify Native OS
                </button>
              </form>
            </div>

            <div className="text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-800/40 text-center">
              OS Module: TAURI_NOTIFICATION_API | ATTENTION_FLASH
            </div>
          </div>
        </div>

        {/* System Diagnostics footer */}
        <div className="w-full max-w-4xl mt-6 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div>OS Host: Windows Desktop Native (Tauri client)</div>
          <div>Sync Core: Active</div>
          <div>OmniChat Client v1.0.0</div>
        </div>
      </div>
    </div>
  );
};
