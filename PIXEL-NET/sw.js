// PIXEL-NET lightweight app shell. No scores, credentials or ROMs cached.
const CACHE = 'pixelnet-install-v1';
const ROOT = new URL('./', self.registration.scope);
const SHELL = ['index.html','manifest.webmanifest','games.json',
  'icons/arcade-192.png','icons/arcade-512.png'].map(name=>new URL(name, ROOT).href);
self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.all(SHELL.map(url=>cache.add(new Request(url,{cache:'reload'})).catch(()=>undefined)));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('pixelnet-install-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || !url.href.startsWith(ROOT.href))return;
  if(/\.(rom|bin|zip|nes|a26|gb|gbc|gba)$/i.test(url.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(request);
        if(fresh.ok && url.pathname===new URL('index.html',ROOT).pathname){
          const cache=await caches.open(CACHE);await cache.put(request,fresh.clone());
        }
        return fresh;
      }catch(_){
        const cache=await caches.open(CACHE);
        return (await cache.match(request)) ||
          (await cache.match(new URL('index.html',ROOT).href)) || Response.error();
      }
    })());
    return;
  }
  if(SHELL.includes(url.href))
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
