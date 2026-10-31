// Live HTTP and read-only Firebase audit. Never writes to production.
const fs=require('node:fs');
const ROOT='https://28twagg-ops.github.io';
const DB='https://pixel-net-arcade-default-rtdb.firebaseio.com';
const paths=['/','/PIXEL-NET/','/PIXEL-NET/games.json',
 '/PIXEL-NET/wrapper/shell.js','/PIXEL-NET/games/millipede-chaos-v3/wrapper-v2.html',
 '/PIXEL-NET/games/neon-chase-v2/wrapper-v2.html'];
const boards=['neon-chase','millipede-chaos','spyder-blackjack','spyder-holdem'];
const results={timestamp:new Date().toISOString(),pages:[],leaderboards:[],warnings:[]};
async function check(url){
 try{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
  const resp=await fetch(url,{signal:ctrl.signal,cache:'no-store'});
  clearTimeout(timer);
  const content=await resp.text();
  return {status:resp.status,ok:resp.ok,type:resp.headers.get('content-type'),
   sample:content.slice(0,180).replace(/\n/g,' '),size:content.length};
 }catch(e){return {error:String(e)}}
}
(async()=>{
 for(const path of paths)results.pages.push({url:ROOT+path,...await check(ROOT+path)});
 // Read the PUBLISHED catalog instead of assuming development assets
 // already exist on GitHub Pages. The branches are intentionally separate.
 const localCatalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
 const publicCatalogResponse=await check(ROOT+'/PIXEL-NET/games.json');
 let catalog=[];
 try{
   const r=await fetch(ROOT+'/PIXEL-NET/games.json',{cache:'no-store'});
   if(r.ok)catalog=await r.json();
 }catch(e){results.warnings.push('Public catalog unreadable: '+e)}
 if(!Array.isArray(catalog))catalog=[];
 results.developmentCatalogCount=localCatalog.length;
 results.publicCatalogCount=catalog.length;
 results.improvedBuildPublished=!!catalog.length&&catalog.every(game=>{
   const planned=localCatalog.find(x=>x.slug===game.slug);
   return !!planned&&planned.thumb===game.thumb;
 });
 if(!results.improvedBuildPublished){
   results.warnings.push('Public main is not yet the optimized development build; this is expected until release.');
 }
 results.gameRoutes=await Promise.all(catalog.map(async game=>{
   const url=ROOT+'/PIXEL-NET/'+game.path;
   return {slug:game.slug,url,...await check(url)};
 }));
 results.thumbnails=await Promise.all(catalog.map(async game=>{
   const url=ROOT+'/PIXEL-NET/'+game.thumb;
   // HEAD avoids pulling asset bodies. Use only PUBLISHED image URLs.
   try{
     const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(12000)});
     return {slug:game.slug,url,status:r.status,ok:r.ok};
   }catch(e){return {slug:game.slug,url,error:String(e)}}
 }));
 // Read-only verification of user-created Firebase console test entry.
 const testURL=DB+'/lb/neon-chase/Test.json';
 const testResponse=await check(testURL);
 let testEntry=null;
 try{testEntry=JSON.parse(testResponse.sample||'null')}catch(_){}
 results.manualTestEntry={url:testURL,status:testResponse.status,
  found:!!(testEntry&&testEntry.initials==='TST'&&testEntry.score===123),
  initials:testEntry?.initials||null,score:testEntry?.score??null};
 console.log('MANUAL_TEST_ENTRY '+JSON.stringify(results.manualTestEntry));
 for(const slug of boards){
  const url=DB+'/lb/'+slug+'.json';
  const response=await check(url);
  results.leaderboards.push({slug,url,...response});
  if(!response.ok)results.warnings.push('Leaderboard '+slug+': '+(response.status||response.error));
 }
 fs.mkdirSync('live-audit-results',{recursive:true});
 results.gameRouteProblems=results.gameRoutes.filter(x=>!x.ok).map(x=>({slug:x.slug,status:x.status,error:x.error}));
 results.thumbnailProblems=results.thumbnails.filter(x=>!x.ok).map(x=>({slug:x.slug,status:x.status,error:x.error}));
 fs.writeFileSync('live-audit-results/report.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
