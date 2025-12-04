/**
 * Service Worker Registration Utility
 * Handles registration, updates, and lifecycle events for the PWA service worker
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  // Only register in production and if service workers are supported
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    console.log('[SW] Development mode - service worker registration skipped');
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported in this browser');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[SW] Service worker registered successfully:', registration.scope);

        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) {
            return;
          }

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[SW] New content available; please refresh');
                if (config && config.onUpdate) {
                  config.onUpdate(registration);
                }
              } else {
                // Content cached for offline use
                console.log('[SW] Content cached for offline use');
                if (config && config.onSuccess) {
                  config.onSuccess(registration);
                }
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[SW] Service worker registration failed:', error);
        if (config && config.onError) {
          config.onError(error);
        }
      });
  });
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[SW] Service worker unregistered');
      })
      .catch((error) => {
        console.error('[SW] Service worker unregistration failed:', error);
      });
  }
}

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the device is a desktop
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];

  return !mobileKeywords.some((keyword) => userAgent.includes(keyword));
}

/**
 * Request notification permission (for desktop notifications)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Send a notification via service worker
 */
export async function sendNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      ...options,
    });
  }
}

/**
 * Clear all caches (useful for troubleshooting)
 */
export async function clearAllCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}
