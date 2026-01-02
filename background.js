// Background service worker placeholder for future GitNinja background tasks.
// Keep it minimal for now.
self.addEventListener('install', (event) => {
  console.log('GitNinja service worker installed');
});
self.addEventListener('activate', (event) => {
  console.log('GitNinja service worker activated');
});

// keyboard shortcuts removed — no command forwarding
