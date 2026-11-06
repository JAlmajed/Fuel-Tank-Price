// Bump this number whenever you want every device to drop its old cache.
const CACHE_NAME = "bahrain-fuel-cost-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./prices.json",
    "./manifest.json",
    "./apple-touch-icon.png",
    "./favicon.ico",
    "./favicon-32.png"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names
                    .filter(function (name) { return name !== CACHE_NAME; })
                    .map(function (name) { return caches.delete(name); })
            );
        })
    );
    self.clients.claim();
});

// Network first, so new prices show up as soon as the device is online.
self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;
    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
                return response;
            })
            .catch(function () { return caches.match(event.request); })
    );
});
