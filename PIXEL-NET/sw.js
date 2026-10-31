// PIXEL-NET installed arcade: online updates are network-first, not frozen.
// Game source files and leaderboards are always requested live; cached
// homepage, catalog, and icons provide only a limited offline shell.
const CACHE='pixelnet-install-v4';
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
  // After a successful visit, keep only the source files required to replay
  // this particular game offline. This is NOT an all-games offline pack.
  // Never cache cross-origin content, database requests, or score uploads.
  const relativePath=url.pathname.slice(ROOT.pathname.length);
  const visitedGameResource=/^games\/.+\.(?:html|js|css)$/i.test(relativePath);
  const sharedGameResource=/^(?:wrapper\/(?:shell\.js|shell\.css)|install\.js)$/i.test(relativePath);
  const offlineEligible=visitedGameResource||sharedGameResource;
  if(!navigation&&!inCache&&!offlineEligible)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req,{cache:'no-store'});
      if(response.ok && (inCache || offlineEligible || (navigation&&url.href===HOME))){
        const cache=await caches.open(CACHE);
        await cache.put(req,response.clone());
      }
      return response;
    }catch(_){
      const cache=await caches.open(CACHE);
      if(navigation){
        const cached=await cache.match(req);
        if(cached)return cached;
        // A game that was never visited cannot run offline. Do not
        // silently replace its game page with the arcade homepage.
        if(url.href===HOME || url.pathname===ROOT.pathname){
          return (await cache.match(HOME))||Response.error();
        }
        const home=new URL('index.html',ROOT).pathname;
        return new Response('<!doctype html><html lang="en"><meta charset="utf-8">'+
          '<meta name="viewport" content="width=device-width,initial-scale=1">'+
          '<title>Game unavailable offline</title>'+
          '<body style="background:#0a0e27;color:#fff;font:18px system-ui;padding:2rem">'+
          '<h1>Game unavailable offline</h1>'+
          '<p>Open this game once online to save its core files for offline replay. Some external assets may still need internet.</p>'+
          '<a style="color:#55f5ff" href="'+home+'">Return to PIXEL-NET</a></body></html>',
          {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      return (await cache.match(req))||Response.error();
    }
  })());
});
