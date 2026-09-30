// sw.js —— 离线缓存"服务生"
// 作用：第一次访问时把页面文件存进浏览器缓存；之后即使断网，也能打开这个 App。
// 学习要点：这里只有 3 个核心动作 —— install（安装缓存）、fetch（响应请求）、activate（激活）。

var CACHE_NAME = 'my-app-v1';
// 要缓存的文件清单（和 index.html 同目录）
var CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. 安装：把文件写入缓存
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
});

// 2. 请求拦截：优先用缓存，缓存没有再去网络
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

// 3. 激活：清理旧版本缓存（这里简单起见只保留当前版本）
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
});