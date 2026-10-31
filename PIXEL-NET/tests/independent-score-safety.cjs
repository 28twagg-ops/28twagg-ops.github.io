// PIXEL-NET mocked score pipeline security regression. NO PRODUCTION WRITES.
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();
 const uploads=[];
 const standard=Array.from({length:15},(_,i)=>({initials:'STD',score:500-i,mode:'STANDARD',t:i}));
 const analysis=Array.from({length:5},(_,i)=>({initials:'ANA',score:100-i,mode:'ANALYSIS',t:i}));
 await context.route(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/,async route=>{
   const r=route.request(),u=r.url();
   if(r.method()==='POST'||r.method()==='PUT'){
     uploads.push({url:u,method:r.method(),payload:JSON.parse(r.postData()||'{}')});
     await route.fulfill({status:403,contentType:'application/json',body:'{"error":"Mock: production writes blocked"}'});
   }else if(u.includes('/lb/spyder-blackjack.json')){
     await route.fulfill({status:200,contentType:'application/json',
       body:JSON.stringify(Object.fromEntries([...standard,...analysis].map((x,i)=>[String(i),x])))});
   }else{
     await route.fulfill({status:200,contentType:'application/json',body:'null'});
   }
 });
 async function open(slug){
   const page=await context.newPage();
   await page.addInitScript(()=>{
      localStorage.setItem('PIXELNET_INITIALS','QA1');
      localStorage.setItem('playerInitials','QA1');
   });
   await page.goto(BASE+'games/'+slug+'/wrapper-v2.html',{waitUntil:'domcontentloaded'});
   await page.locator('#gameDesktop').waitFor();
   await page.waitForFunction(()=>document.querySelector('#gameDesktop')?.contentWindow?.location.href!=='about:blank');
   return page;
 }
 try{
  const p=await open('neon-chase-v2');
  // Any unrelated tab/window message should be rejected.
  await p.evaluate(()=>window.postMessage({type:'GAME_OVER_SCORE',score:444},location.origin));
  await p.waitForTimeout(200);
  assert.equal(uploads.length,0,'Parent-window spoof created a score');
  const frame=p.frameLocator('#gameDesktop');
  await frame.locator('body').evaluate(()=>window.parent.postMessage({type:'GAME_OVER_SCORE',score:42},location.origin));
  await p.waitForTimeout(250);
  await p.locator('.shell .panel.leaderboard [role="status"]').filter({hasText:'Saved locally; online upload unavailable.'}).first().waitFor({timeout:5000});
  assert.equal(uploads.length,1,'Legitimate game-origin message should be handed off once');
  assert.equal(uploads[0].payload.score,42);
  assert.ok(uploads[0].url.includes('/lb/neon-chase.json'));
  await frame.locator('body').evaluate(()=>{
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:-3},location.origin);
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:'Infinity'},location.origin);
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:2.5},location.origin);
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:9999999999999999},location.origin);
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:5,slug:'spyder-holdem'},location.origin);
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:42},location.origin);
  });
  await p.waitForTimeout(240);
  assert.equal(uploads.length,1,'Invalid or duplicate burst score leaked to backend');
  await p.close();
  const licensed=await open('licensed-2048');
  await licensed.frameLocator('#gameDesktop').locator('body').evaluate(
    ()=>window.parent.postMessage({type:'GAME_OVER_SCORE',score:9999},location.origin));
  await licensed.waitForTimeout(200);
  assert.equal(uploads.length,1,'Licensed game sent a shared score');
  await licensed.close();
  const casino=await open('spyder-casino');
  await casino.locator('#boardDesktopBjStd .boardRow').first().waitFor();
  assert.equal(await casino.locator('#boardDesktopBjStd .boardRow').count(),10);
  assert.equal(await casino.locator('#boardDesktopBjAn .boardRow').count(),5,
    'Analysis scores disappeared behind top 10 Standard records');
  const casFrame=casino.frameLocator('#gameDesktop');
  await casFrame.locator('body').evaluate(()=>{
    window.parent.postMessage({type:'PIXELNET_SCORE',score:10,slug:'spyder-blackjack',mode:'ANALYSIS'},location.origin);
  });
  await casino.waitForTimeout(220);
  assert.equal(uploads.length,2,'Casino must emit one wrapper write');
  assert.equal(uploads[1].payload.mode,'ANALYSIS');
  assert.ok(uploads[1].url.includes('/lb/spyder-blackjack.json'));
  await casino.close();
  console.log('SCORE_SAFETY_PASS 3 sources; mocked uploads='+uploads.length+'; no production writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
