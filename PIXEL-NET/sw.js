// PIXEL-NET installed arcade: online updates are network-first, not frozen.
// Game source files and leaderboards are always requested live; cached
// homepage, catalog, and icons provide only a limited offline shell.
const CACHE='pixelnet-install-v2';
const ROOT=new URL('./',self.registration.scope);
const HOME=new URL('index.html',ROOT).href;
const CATALOG=new URL('games.json',ROOT).href;
const ICONS=['icons/arcade-192.png','icons/arcade-512.png']
  .map(path=>new URL(path,ROOT).href);
const SHELL=[HOME,CATALOG,new URL('manifest.webmanifest',ROOT).href,...ICONS];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(SHELL.map(url=>
      cache.add(new Request(url,{cache:'reload'})).catch(()=>undefined)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('pixelnet-install-')&&key!==CACHE)
      .map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(ROOT.href))return;
  if(/\.(rom|bin|zip|nes|a26|gb|gbc|gba)$/i.test(url.pathname))return;
  const navigation=req.mode==='navigate';
  const inCache=SHELL.includes(url.href);
  if(!navigation&&!inCache)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req,{cache:'no-store'});
      if(response.ok && (inCache || (navigation&&url.href===HOME))){
        const cache=await caches.open(CACHE);
        await cache.put(req,response.clone());
      }
      return response;
    }catch(_){
      const cache=await caches.open(CACHE);
      if(navigation)return (await cache.match(req))||(await cache.match(HOME))||Response.error();
      return (await cache.match(req))||Response.error();
    }
  })());
});
