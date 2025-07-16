const CACHE_NAME = 'image-cache-v1';

// 설치 시 (필요시 미리 캐싱할 파일 지정 가능)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // return cache.addAll(['/images/logo1.png', ...]);
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// fetch 요청 가로채기
self.addEventListener('fetch', event => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return (
          response ||
          fetch(event.request)
            .then(fetchResponse => {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
            })
            .catch(() => {
              // 네트워크도 안 되고 캐시도 없으면 대체 이미지 반환(선택)
              // return caches.match('/images/fallback.png');
              return Response.error();
            })
        );
      })
    );
  }
}); 