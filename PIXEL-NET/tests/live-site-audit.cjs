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
 for(const slug of boards){
  const url=DB+'/lb/'+slug+'.json';
  const response=await check(url);
  results.leaderboards.push({slug,url,...response});
  if(!response.ok)results.warnings.push('Leaderboard '+slug+': '+(response.status||response.error));
 }
 fs.mkdirSync('live-audit-results',{recursive:true});
 fs.writeFileSync('live-audit-results/report.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
