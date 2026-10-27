// Mock-only leaderboard tests. Does NOT send or alter production scores.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const summary={tests:[],requests:[]};
 const local='http://127.0.0.1:8765/';
 try{
  // Offline cloud / invalid Firebase permissions must never say GLOBAL LIVE.
  const context=await browser.newContext({viewport:{width:1400,height:900}});
  await context.route(/firebaseio\.com/,route=>{
    const req=route.request(),method=req.method();
    summary.requests.push({method,url:new URL(req.url()).pathname});
    return route.fulfill({status:401,contentType:'application/json',body:'{"error":"Permission denied"}'});
  });
  const page=await context.newPage();
  await page.goto(local+'games/neon-chase-v2/wrapper-v2.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-lb-status]')?.textContent==='LOCAL ONLY');
  assert.ok((await page.locator('#boardNoticeDesktop').textContent()).includes('Database permission denied'));
  summary.tests.push('Denied Firebase visibly reports LOCAL ONLY');
  // Score must still be recorded locally on client only.
  const child=page.frameLocator('#gameDesktop');
  await child.locator('body').evaluate(()=>{
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:105},location.origin);
  });
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('LB_neon-chase')||'[]')
    .some(r=>r.score===105));
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('LB_neon-chase')))).length,1);
  summary.tests.push('Scores persist locally if Firebase refuses submission');
  await context.close();

  // Simulated successful cloud: verify read + write, score mode separation, and
  // no duplicate POST on two identical game-over messages.
  const casino=await browser.newContext({viewport:{width:1400,height:900}});
  const posts=[];
  await casino.route('**/wrapper/shell.js',async route=>{
    const response=await route.fetch();
    const code=(await response.text()).replace('const FIREBASE_WEB_API_KEY = "";',
      'const FIREBASE_WEB_API_KEY = "TEST_KEY";');
    await route.fulfill({response,body:code,contentType:'application/javascript'});
  });
  await casino.route(/identitytoolkit.googleapis.com/,route=>
    route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({idToken:'mock-token',expiresIn:'3600'})}));
  await casino.route(/firebaseio\.com/,route=>{
    const req=route.request(),method=req.method();
    if(method==='POST'){
      const json=JSON.parse(req.postData()||'{}');
      posts.push({url:req.url(),data:json});
      return route.fulfill({status:200,contentType:'application/json',body:'{"name":"test-only"}'});
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  const board=await casino.newPage();
  await board.goto(local+'games/spyder-casino/wrapper-v2.html',{waitUntil:'domcontentloaded'});
  await board.waitForFunction(()=>[...document.querySelectorAll('[data-lb-status]')]
    .some(e=>e.textContent==='GLOBAL LIVE'));
  const iframe=board.frameLocator('#gameDesktop');
  await iframe.locator('body').evaluate(()=>{
    const payload={type:'PIXELNET_SCORE',score:185,slug:'spyder-blackjack',mode:'ANALYSIS'};
    window.parent.postMessage(payload,location.origin);
    window.parent.postMessage(payload,location.origin);
  });
  await board.waitForFunction(()=>JSON.parse(localStorage.getItem('LB_spyder-blackjack')||'[]')
    .some(r=>r.score===185));
  await board.waitForTimeout(300);
  assert.equal(posts.length,1,'One score event means one authenticated Firebase write');
  assert.ok(posts[0].url.includes('auth=mock-token'),'Authenticated token missing');
  assert.equal(posts[0].data.mode,'ANALYSIS','Casino mode must persist');
  const records=await board.evaluate(()=>JSON.parse(localStorage.getItem('LB_spyder-blackjack')));
  assert.equal(records.length,1);
  assert.equal(records[0].mode,'ANALYSIS');
  summary.tests.push('Spyder analysis score submitted once to mock backend with mode intact');
  await casino.close();
  fs.mkdirSync('leaderboard-regression-results',{recursive:true});
  fs.writeFileSync('leaderboard-regression-results/results.json',JSON.stringify(summary,null,2));
  console.log('PASS '+summary.tests.join('; '));
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
