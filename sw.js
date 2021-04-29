// SW version
const version = `1.0.11`;
const cacheName = `static-${version}`;

// SW app assets
const appAssets = [
  "index.html",
  "main.js",
  "images/flame.png",
  "images/logo.png",
  "images/sync.png",
  "vendor/bootstrap.min.css",
  "vendor/jquery.min.js"
];

// SW install
self.addEventListener('install', async(e) => {
  const cacheReady = await caches.open(cacheName).then(cache => cache.addAll(appAssets))
    .catch(console.log);
});

// SW activate
self.addEventListener('activate', async(e) => {
  
  // clean/update/remove old static cache
  const cacheClean = await caches.keys().then(keys => {
    keys.forEach(key => {
      if(key !== cacheName && key.match('static-')){
        return caches.delete(key);
      }
    });
  })
});

/**
 *  Static cache : Cache with N/W fallback
 *  Here try cache first then network if fails.
 */
const staticCache = async(req, cachename = cacheName) => {
  return caches.match(req).then(cacheRes => {
    // return cache if match found
    if(cacheRes) return cacheRes;
    // else fetch & update cache
    return fetch(req).then(networkRes => {
      // update cache with new response
      caches.open(cachename).then(cache => cache.put(req, networkRes));
      // return network response clone
      return networkRes.clone();
    })
  })
};

/**
 *  Fallback cache : Cache with N/W fallback
 *  Here try cache first then network if fails.
 */
const fallbackCache = async(req) => {
  return fetch(req).then(networkRes => {
    
    if(!networkRes.ok) throw "Fetch Failed";
    caches.open(cacheName).then(cache => cache.put(req, networkRes));
    return networkRes.clone();
  }).catch(err => caches.match(req));
}

/**
 * Clean Giphy Cache to control cache size
 */
const cleanGiphyCache = giphys => {
  caches.open("giphy").then(cache => {
    cache.keys().then(keys => {
      keys.forEach(key => {
        if(!giphys.includes(key.url)) caches.delete(key);
      })
    })
  })
}

// SW Fetch
self.addEventListener('fetch', e => {
  const { url } = e.request;
  if(url.match(location.origin)){
    e.respondWith(staticCache(e.request));
  } else if(url.match("api.giphy.com/v1/gifs/trending")) {
    e.respondWith(fallbackCache(e.request));
  } else if(url.match("giphy.com/media")) {
    e.respondWith(staticCache(e.request, "giphy"));
  }
});

self.addEventListener("message", e => {
  if(e.data.action === "cleanGiphyCache") cleanGiphyCache(e.data.giphys);
})