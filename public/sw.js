// Garde l'application et les recettes disponibles hors ligne (jamais l'API ni les données personnelles).
const V = "alma-v6";
const SHELL = ["./", "index.html", "style.css", "app.js", "lib.js", "i18n.js", "config.js", "recipes.json", "ingredients.json", "regions.json", "glossary.json", "manifest.webmanifest", "icon.svg", "legal.html", "legal.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); }
        return res;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }))
  );
});
