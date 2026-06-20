// Mayaka Audio Extractor — Service Worker
// Caches the FFmpeg core assets (~25 MB) so repeat visits load almost instantly.

const CACHE_NAME = 'mayaka-ffmpeg-core-v1';
const FFMPEG_CORE_PATTERN = /unpkg\.com\/@ffmpeg\/core@/;
const FFMPEG_LIB_PATTERN = /unpkg\.com\/@ffmpeg\/ffmpeg@/;

self.addEventListener('install', (event) => {
    // Activate immediately so the cache is available without a second reload
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Drop any older cache versions
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((n) => n.startsWith('mayaka-ffmpeg-core-') && n !== CACHE_NAME)
                .map((n) => caches.delete(n))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    if (!FFMPEG_CORE_PATTERN.test(url) && !FFMPEG_LIB_PATTERN.test(url)) {
        return; // Let the browser handle non-FFmpeg requests normally
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
            const response = await fetch(event.request);
            // Only cache successful, basic/cors responses (avoid opaque)
            if (response && response.status === 200 && response.type !== 'opaque') {
                cache.put(event.request, response.clone()).catch(() => { /* quota / ignore */ });
            }
            return response;
        } catch (err) {
            // Offline and not cached — propagate failure
            throw err;
        }
    })());
});
