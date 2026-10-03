// sw.js — 留言板专用离线缓存（v2 修复版）
// 修复：排除跨域 API 请求（Supabase）避免缓存错误响应导致"Failed to fetch"

const CACHE_NAME = 'guestboard-v2';
// 只缓存同源的静态资源（页面、图标、清单）
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：把静态资源写入缓存
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CACHE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存，并立即接管所有客户端
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 请求拦截：
// 1. 跨域请求（Supabase API）直接走网络，不缓存
// 2. 同源静态资源优先用缓存，缓存没有再请求网络
// 3. fetch 失败时返回 503，绝不返回 undefined（避免浏览器抛"Failed to fetch"）
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 只处理 GET 请求
  if (req.method !== 'GET') return;

  // 跨域请求：直接走网络，不加缓存（避免缓存 Supabase 的 4xx/5xx 错误响应）
  if (new URL(req.url).origin !== self.location.origin) {
    e.respondWith(
      fetch(req).catch(() =>
        new Response('网络不可用', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      )
    );
    return;
  }

  // 同源静态资源：缓存优先
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          new Response('网络不可用', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        );
    })
  );
});
