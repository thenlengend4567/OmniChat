// Dynamic dynamic loader for window API compatibility
let appWindow: any = null;

const initTauriWindow = async () => {
  if (appWindow) return appWindow;
  try {
    const windowModule = await import('@tauri-apps/api/window');
    if ('getCurrentWindow' in windowModule) {
      appWindow = (windowModule as any).getCurrentWindow();
    } else if ('appWindow' in windowModule) {
      appWindow = (windowModule as any).appWindow;
    }
  } catch (err) {
    console.warn('[Notification] Tauri window API not available.');
  }
  return appWindow;
};

// Dynamic dynamic loader for notification API compatibility
let notificationApi: any = null;

const initTauriNotification = async () => {
  if (notificationApi) return notificationApi;
  try {
    // Tauri v2 plugin
    notificationApi = await import('@tauri-apps/plugin-notification');
  } catch {
    console.warn('[Notification] Tauri notification plugin not found. Will use web fallback.');
  }
  return notificationApi;
};

export interface NotificationPayload {
  title: string;
  body: string;
  senderName?: string;
  avatarUrl?: string;
}

/**
 * Ensures that notification permissions are requested and granted.
 * Falls back to browser Web Notification API if not running in Tauri.
 */
export async function checkAndRequestPermissions(): Promise<boolean> {
  try {
    const isTauri = typeof window !== 'undefined' && '__TAURI_METADATA__' in window;
    const tauriNotification = await initTauriNotification();
    
    if (isTauri && tauriNotification) {
      let permissionGranted = false;
      if (typeof tauriNotification.isPermissionGranted === 'function') {
        permissionGranted = await tauriNotification.isPermissionGranted();
      }
      
      if (!permissionGranted && typeof tauriNotification.requestPermission === 'function') {
        console.log('[Notification] Requesting native Tauri notification permission...');
        const permission = await tauriNotification.requestPermission();
        permissionGranted = permission === 'granted';
      }
      console.log('[Notification] Native Tauri notification permission state:', permissionGranted);
      return permissionGranted;
    } else {
      // Browser fallback
      if (!('Notification' in window)) {
        console.warn('[Notification] This browser does not support desktop notifications.');
        return false;
      }
      
      if (Notification.permission === 'granted') {
        return true;
      }
      
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      
      return false;
    }
  } catch (error) {
    console.error('[Notification] Failed to check or request notification permissions:', error);
    return false;
  }
}

/**
 * Dispatches a native Windows desktop notification for an incoming message.
 * On click, it automatically restores and focuses the OmniChat desktop window.
 */
export async function showMessageNotification(payload: NotificationPayload): Promise<void> {
  try {
    const hasPermission = await checkAndRequestPermissions();
    if (!hasPermission) {
      console.warn('[Notification] Cannot show notification: Permission denied by user or OS.');
      return;
    }

    const { title, body, senderName } = payload;
    const isTauri = typeof window !== 'undefined' && '__TAURI_METADATA__' in window;
    const tauriNotification = await initTauriNotification();
    const win = await initTauriWindow();

    const notificationTitle = senderName ? `${senderName} via OmniChat` : title;

    if (isTauri && tauriNotification && typeof tauriNotification.sendNotification === 'function') {
      console.log('[Notification] Dispatching native system toast notification for:', notificationTitle);
      
      // Dispatch Tauri native notification
      tauriNotification.sendNotification({
        title: notificationTitle,
        body: body,
      });

      if (win) {
        if (typeof win.unminimize === 'function') await win.unminimize();
        if (typeof win.show === 'function') await win.show();
        if (typeof win.setFocus === 'function') await win.setFocus();
      }
      
    } else {
      console.log('[Notification] Dispatching browser toast notification fallback for:', notificationTitle);
      
      // Fallback standard browser notification
      const notification = new Notification(notificationTitle, {
        body: body,
        icon: '/favicon.ico', // fallback app icon
      });

      notification.onclick = async () => {
        window.focus();
        if (win) {
          if (typeof win.unminimize === 'function') await win.unminimize();
          if (typeof win.show === 'function') await win.show();
          if (typeof win.setFocus === 'function') await win.setFocus();
        }
      };
    }
  } catch (error) {
    console.error('[Notification] Failed to dispatch desktop notification:', error);
  }
}

/**
 * Triggers a simple Windows incoming message sound or native flash
 */
export async function flashWindow(): Promise<void> {
  try {
    const win = await initTauriWindow();
    if (win) {
      const isFocused = typeof win.isFocused === 'function' ? await win.isFocused() : false;
      if (!isFocused && typeof win.requestUserAttention === 'function') {
        // Tauri flashes the taskbar icon
        // 1 represents Informational, 2 represents Critical
        await win.requestUserAttention(1);
        console.log('[Notification] Window flashed to request user attention.');
      }
    }
  } catch (err) {
    console.error('[Notification] Failed to request window attention:', err);
  }
}
