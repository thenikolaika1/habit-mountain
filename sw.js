// Bumped for the v3 habit-photos work (auto-category detection, the medal/
// category photo pack, and several rounds of object-position crop tuning
// across css/illustrations.css) — none of that landed here since v2, so
// anyone with the app already installed was stuck on cache-first stale
// CSS/JS the whole time (fetch handler below is cache-first: a hit never
// re-checks the network). A new cache name makes the "activate" handler
// purge the old cache wholesale instead of leaving a stale mix behind.
const CACHE_NAME = "habit-mountain-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/variables.css",
  "./css/base.css",
  "./css/components.css",
  "./css/mountain.css",
  "./css/calendar.css",
  "./css/illustrations.css",
  "./js/app.js",
  "./js/illustrations.js",
  "./js/mountainSvg.js",
  "./js/state/storage.js",
  "./js/state/habits.js",
  "./js/state/entries.js",
  "./js/state/derive.js",
  "./js/logic/dateUtils.js",
  "./js/logic/completion.js",
  "./js/logic/streaks.js",
  "./js/logic/points.js",
  "./js/logic/achievements.js",
  "./js/logic/challenges.js",
  "./js/logic/progress.js",
  "./js/logic/units.js",
  "./js/logic/theme.js",
  "./js/views/mountainView.js",
  "./js/views/habitsView.js",
  "./js/views/calendarView.js",
  "./js/views/dayDetailView.js",
  "./js/views/daySummaryView.js",
  "./js/views/achievementsView.js",
  "./js/views/challengesView.js",
  "./js/views/settingsView.js",
  "./js/components/tabBar.js",
  "./js/components/modal.js",
  "./js/components/monthSummary.js",
  "./js/components/monthRecap.js",
  "./js/components/toast.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
