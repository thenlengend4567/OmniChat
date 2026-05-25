import { invoke } from '@tauri-apps/api/tauri';

// Define the interface for session data matching the Rust backend
export interface SessionData {
  token: string;
  user_id: string;
  email: string;
  expires_at: number; // Unix timestamp in seconds
  cookies: string[];
}

const STORAGE_KEYS = {
  TOKEN: 'omnichat_auth_token',
  USER_ID: 'omnichat_user_id',
  EMAIL: 'omnichat_user_email',
  EXPIRES_AT: 'omnichat_session_expiry',
};

/**
 * Utility to parse cookies from document.cookie into a key-value dictionary
 */
export function getCookies(): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (typeof document === 'undefined') return cookies;
  
  const cookieStr = document.cookie || '';
  cookieStr.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

/**
 * Utility to set a cookie with options
 */
export function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
  const cookieString = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax; ${secure}`;
  document.cookie = cookieString;
}

/**
 * Utility to delete a cookie
 */
export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Reads user login credentials and session cookies from the webview context
 * and synchronizes them to the native Rust backend.
 */
export async function syncSessionFromWebview(): Promise<boolean> {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const email = localStorage.getItem(STORAGE_KEYS.EMAIL);
    const expiresAtStr = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

    if (!token || !userId || !email) {
      console.log('[SyncSession] Missing local credentials. Nothing to sync to Rust backend.');
      return false;
    }

    const expires_at = expiresAtStr ? parseInt(expiresAtStr, 10) : Math.floor(Date.now() / 1000) + 86400;

    // Gather all cookies that should be synchronized (e.g. session-id, session-cookie)
    const rawCookies = getCookies();
    const serializedCookies = Object.entries(rawCookies).map(([k, v]) => `${k}=${v}`);

    const sessionData: SessionData = {
      token,
      user_id: userId,
      email,
      expires_at,
      cookies: serializedCookies,
    };

    console.log('[SyncSession] Syncing login session to Rust for user:', email);
    const result = await invoke<string>('sync_session', { session: sessionData });
    console.log('[SyncSession] Rust sync result:', result);
    return true;
  } catch (error) {
    console.error('[SyncSession] Failed to sync session from webview to native layer:', error);
    return false;
  }
}

/**
 * Restores session credentials and cookies from the Rust backend
 * back into the webview storage and document.cookie.
 */
export async function restoreSessionToWebview(): Promise<SessionData | null> {
  try {
    console.log('[SyncSession] Querying session credentials from Rust...');
    const session = await invoke<SessionData | null>('get_session');
    
    if (!session) {
      console.log('[SyncSession] No active session found in Rust storage.');
      return null;
    }

    console.log('[SyncSession] Session found! Restoring credentials to webview for:', session.email);
    
    // 1. Restore local storage
    localStorage.setItem(STORAGE_KEYS.TOKEN, session.token);
    localStorage.setItem(STORAGE_KEYS.USER_ID, session.user_id);
    localStorage.setItem(STORAGE_KEYS.EMAIL, session.email);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, session.expires_at.toString());

    // 2. Restore cookies
    const maxAge = Math.max(0, session.expires_at - Math.floor(Date.now() / 1000));
    session.cookies.forEach((cookieStr) => {
      const parts = cookieStr.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        setCookie(name, decodeURIComponent(value), maxAge);
      }
    });

    // Fire custom event to notify React app that auth is ready
    window.dispatchEvent(new CustomEvent('auth-restored', { detail: session }));
    return session;
  } catch (error) {
    console.error('[SyncSession] Failed to restore session from native layer:', error);
    return null;
  }
}

/**
 * Clear the session in both the webview and native Rust layer.
 */
export async function clearSession(): Promise<boolean> {
  try {
    console.log('[SyncSession] Clearing session in webview and Rust...');
    
    // 1. Clear local storage
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);

    // 2. Clear cookies
    const rawCookies = getCookies();
    Object.keys(rawCookies).forEach((name) => {
      deleteCookie(name);
    });

    // 3. Clear Rust state
    const result = await invoke<string>('clear_session');
    console.log('[SyncSession] Rust clear result:', result);

    window.dispatchEvent(new CustomEvent('auth-cleared'));
    return true;
  } catch (error) {
    console.error('[SyncSession] Failed to clear session:', error);
    return false;
  }
}

/**
 * Sets up listeners to automatically synchronize credentials when they change.
 * It monitors localStorage changes and handles tab/window sync events.
 */
export function setupSessionSyncObserver(): () => void {
  // Listener for storage events (e.g. user logs in from another page/component)
  const handleStorageChange = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEYS.TOKEN ||
      e.key === STORAGE_KEYS.USER_ID ||
      e.key === STORAGE_KEYS.EMAIL
    ) {
      if (e.newValue) {
        syncSessionFromWebview();
      } else {
        clearSession();
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Periodic fallback check to track cookies and store changes
  let lastToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const intervalId = setInterval(() => {
    const currentToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (currentToken !== lastToken) {
      lastToken = currentToken;
      if (currentToken) {
        syncSessionFromWebview();
      } else {
        clearSession();
      }
    }
  }, 2000);

  // Return clean-up handler
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(intervalId);
  };
}
