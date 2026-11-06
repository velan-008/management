/**
 * BUSINESSFLOW — Service Worker Registration Helper
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[PWA] New version of BUSINESSFLOW shell is available.');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service worker registration failed:', error);
        });
    });
  }
}

