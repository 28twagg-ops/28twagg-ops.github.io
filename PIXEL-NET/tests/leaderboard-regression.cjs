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
    if(method==='PUT'){
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
  assert.ok(new URL(posts[0].url).pathname.startsWith('/lb/spyder-blackjack/pn-'),'Idempotent entry key missing');
  assert.equal(posts[0].data.mode,'ANALYSIS','Casino mode must persist');
  const records=await board.evaluate(()=>JSON.parse(localStorage.getItem('LB_spyder-blackjack')));
  assert.equal(records.length,1);
  assert.equal(records[0].mode,'ANALYSIS');
  summary.tests.push('Spyder analysis score submitted once to mock backend with mode intact');
  await casino.close();
  // Retry reliability: when Firebase is temporarily down, a game-over
  // entry remains queued and reuses the exact same record ID on reconnect.
  const retry=await browser.newContext({viewport:{width:1400,height:900}});
  let backendAvailable=false;
  const attempts=[];
  await retry.route('**/wrapper/shell.js',async route=>{
    const response=await route.fetch();
    const js=(await response.text()).replace('const FIREBASE_WEB_API_KEY = "";',
      'const FIREBASE_WEB_API_KEY = "TEST_KEY";');
    await route.fulfill({response,body:js,contentType:'application/javascript'});
  });
  await retry.route(/identitytoolkit.googleapis.com/,route=>
    route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({idToken:'mock-retry-token',expiresIn:'3600'})}));
  await retry.route(/firebaseio\.com/,route=>{
    const request=route.request();
    if(request.method()==='PUT'){
      attempts.push({path:new URL(request.url()).pathname,body:request.postData()});
      return route.fulfill({status:backendAvailable?200:503,contentType:'application/json',
        body:backendAvailable?'{}':'{"error":"temporarily unavailable"}'});
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  const retryPage=await retry.newPage();
  await retryPage.goto(local+'games/neon-chase-v2/wrapper-v2.html');
  await retryPage.frameLocator('#gameDesktop').locator('body').evaluate(()=>{
    window.parent.postMessage({type:'GAME_OVER_SCORE',score:777},location.origin);
  });
  await retryPage.waitForFunction(()=>{
    const q=JSON.parse(localStorage.getItem('PIXELNET_PENDING_SCORES_V1')||'[]');
    return q.length===1&&q[0].entry.score===777;
  });
  await retryPage.waitForFunction(()=>document.querySelector('#boardNoticeDesktop')?.textContent.includes('queued for global upload'));
  assert.equal(attempts.length,1);
  backendAvailable=true;
  await retryPage.evaluate(()=>window.dispatchEvent(new Event('online')));
  await retryPage.waitForFunction(()=>
    JSON.parse(localStorage.getItem('PIXELNET_PENDING_SCORES_V1')||'[]').length===0);
  assert.equal(attempts.length,2,'One failed PUT and one retry required');
  assert.equal(attempts[0].path,attempts[1].path,
    'A retry must reuse the same score record ID');
  assert.ok(attempts[1].path.includes('/lb/neon-chase/pn-'));
  summary.tests.push('Offline score uploads retry automatically with the same idempotent Firebase record ID');
  await retry.close();

  fs.mkdirSync('leaderboard-regression-results',{recursive:true});
  fs.writeFileSync('leaderboard-regression-results/results.json',JSON.stringify(summary,null,2));
  console.log('PASS '+summary.tests.join('; '));
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
