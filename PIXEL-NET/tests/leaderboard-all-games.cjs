// End-to-end browser integration for EVERY playable PIXEL-NET wrapper.
// Game-owned end-of-run callbacks -> iframe postMessage -> parent wrapper ->
// Firebase anonymous sign-in -> authenticated POST -> refreshed global board.
// Firebase is mocked to prevent synthetic scores polluting the live database.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const target='http://127.0.0.1:8765/';
const triggers={
 'caked-up-cats':"score=123;endGame(false,'QA test');",
 'creek-crosser':"gameState.score=123;gameOver();",
 'astrotype':"state.score=123;gameOver();",
 'knight-flight':"startGame();score=123;lives=1;handlePlayerDeath();",
 'logic-bomb':"score=123;lives=1;handleDeath();",
 'neon-chase':"score=123;gameOver();",
 'robo-arena':"state.score=123;gameOver();",
 'millipede-chaos':"window.__pxQaEnd();",
 'galaxy-swarm-2084':"window.__pxQaEnd();",
 'circuit-salvager':"window.__pxQaEnd();",
 'dig-dug-delve':"window.__pxQaEnd();",
 'combat-cx2601':"window.__pxQaEnd();",
 'atariforce-hyperlane':"window.__pxQaEnd();",
 'jungle-jr-rescue':"window.__pxQaEnd();",
 'kangaroo-climb':"window.__pxQaEnd();",
 'track-field-blitz':"window.__pxQaEnd();",
 'orbit-siege':"window.__pxQaEnd();"
};
const testCases=catalog.flatMap(g=>{
 if(g.slug==='retro-kombat')return [];
 if(g.slug==='spyder-casino')return [
  {slug:g.slug,board:'spyder-blackjack',mode:'STANDARD',path:g.path,
   trigger:"endGameMode='STANDARD';showEndScreen('BLACKJACK','$123','STANDARD',BJ_SLUG);"},
  {slug:g.slug,board:'spyder-blackjack',mode:'ANALYSIS',path:g.path,
   trigger:"endGameMode='ANALYSIS';showEndScreen('BLACKJACK','$123','ANALYSIS',BJ_SLUG);"},
  {slug:g.slug,board:'spyder-holdem',mode:'STANDARD',path:g.path,
   trigger:"endGameMode='STANDARD';showEndScreen('HOLDEM','123 chips','STANDARD',HE_SLUG);"},
  {slug:g.slug,board:'spyder-holdem',mode:'ANALYSIS',path:g.path,
   trigger:"endGameMode='ANALYSIS';showEndScreen('HOLDEM','123 chips','ANALYSIS',HE_SLUG);"}
 ];
 return [{slug:g.slug,board:g.slug,path:g.path,trigger:triggers[g.slug]}];
}).filter(x=>!process.env.PIXELNET_GAME||x.slug===process.env.PIXELNET_GAME);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={total:testCases.length,passed:[],failed:[],skipped:['retro-kombat: non-playable placeholder']};
 try{
  for(const item of testCases){
   const posts=[],errors=[];
   const context=await browser.newContext({viewport:{width:1440,height:900}});
   await context.addInitScript(()=>{try{localStorage.setItem('PIXELNET_INITIALS','TST')}catch(_){}});
   await context.route('**/wrapper/shell.js',async route=>{
    const response=await route.fetch();
    const patched=(await response.text()).replace('const FIREBASE_WEB_API_KEY = "";',
       'const FIREBASE_WEB_API_KEY = "TEST_KEY";');
    await route.fulfill({response,body:patched,contentType:'application/javascript'});
   });
   // Test-only QA hook inside each game's private IIFE. Production HTML is untouched.
   await context.route(/\/games\/[^/]+\/game\.html$/,async route=>{
    const response=await route.fetch();
    let html=await response.text();
    const hookItem=item.slug==='millipede-chaos'
      ?{anchor:'function submitScoreOnce(',call:'submitScoreOnce()'}
      :["galaxy-swarm-2084","circuit-salvager","dig-dug-delve","combat-cx2601","atariforce-hyperlane","jungle-jr-rescue","kangaroo-climb","track-field-blitz","orbit-siege"].includes(item.slug)
       ?{anchor:'function gameOver(',call:'gameOver()'}:null;
    if(hookItem){
      if(!html.includes(hookItem.anchor))throw Error('Missing game-over hook '+item.slug);
      html=html.replace(hookItem.anchor,
        'window.__pxQaEnd=()=>{score=123;'+hookItem.call+'};\n'+hookItem.anchor);
    }
    await route.fulfill({response,body:html,contentType:'text/html'});
   });
   await context.route(/identitytoolkit\.googleapis\.com/,route=>
    route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({idToken:'mock-all-games',expiresIn:'3600'})}));
   await context.route(/firebaseio\.com/,route=>{
    const req=route.request();
    if(req.method()==='PUT'){
     posts.push({url:req.url(),data:JSON.parse(req.postData()||'{}')});
     return route.fulfill({status:200,contentType:'application/json',
       body:'{"name":"mock-created-entry"}'});
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   try{
    assert.ok(item.trigger,'Missing real game ending for '+item.slug);
    const response=await page.goto(target+item.path,{waitUntil:'domcontentloaded',timeout:18000});
    assert.equal(response.status(),200);
    const game=page.frameLocator('#gameDesktop');
    await game.locator('body').waitFor({state:'attached',timeout:12000});
    await page.waitForTimeout(250);
    await page.evaluate(()=>{window.__QA_messages=[];window.addEventListener('message',e=>window.__QA_messages.push({type:e.data?.type,score:e.data?.score,origin:e.origin,sourceOK:e.source===document.querySelector('#gameDesktop')?.contentWindow}))});
    const before=posts.length;
    const triggerError=await game.locator('body').evaluate((_,source)=>{
      try{(0,eval)(source);return null}catch(e){return String(e.stack||e)}
    },item.trigger);
    assert.equal(triggerError,null,'Game lifecycle error: '+triggerError);
    if(item.slug==='neon-chase')console.log('NEON_STATE '+JSON.stringify(await game.locator('body').evaluate(()=>({href:location.href,gameState,score,__px_sentScore}))));
    await page.waitForFunction(({expected,board})=>{
     return JSON.parse(localStorage.getItem('LB_'+board)||'[]')
      .some(x=>x.score===123&&x.initials==='TST');
    },{expected:123,board:item.board},{timeout:6000});
    await page.waitForTimeout(item.slug==='knight-flight'?1200:400);
    assert.equal(posts.length-before,1,'Expected ONE authenticated database write');
    const p=posts[0];
    assert.match(new URL(p.url).pathname,new RegExp('^/lb/'+item.board+'/pn-[^/]+\\.json$'));
    assert.equal(new URL(p.url).searchParams.get('auth'),'mock-all-games');
    assert.equal(p.data.score,123);
    assert.equal(p.data.initials,'TST');
    assert.ok(Math.abs(p.data.t-Date.now())<60000);
    if(item.mode)assert.equal(p.data.mode,item.mode);
    assert.equal(errors.length,0,'Browser error(s): '+errors.join(' / '));
    report.passed.push(item.slug+(item.mode?'/'+item.board+'/'+item.mode:''));
    console.log('PASS '+report.passed[report.passed.length-1]);
   }catch(e){
    let debug=null;
    try{debug=await page.evaluate(()=>({
      initials:localStorage.getItem('PIXELNET_INITIALS'),
      keys:Object.keys(localStorage),
      boardData:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('LB_'))
       .map(k=>[k,localStorage.getItem(k)?.slice(0,350)])),
      frameSrc:document.querySelector('#gameDesktop')?.getAttribute('src'),
      status:document.querySelector('[data-lb-status]')?.textContent,
      notice:document.querySelector('#boardNoticeDesktop')?.textContent
    }))}catch(err){debug={error:String(err)}}
    try{debug.messages=await page.evaluate(()=>window.__QA_messages)}catch(_){}
    console.error('DIAG '+item.slug+' '+JSON.stringify({debug,posts,errors}).slice(0,2000));
    report.failed.push({game:item.slug,board:item.board,mode:item.mode||null,reason:String(e.message||e).slice(0,900),errors,posts,debug});
    console.error('FAIL '+item.slug+' '+(item.mode||'')+' '+e.message);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 fs.mkdirSync('leaderboard-all-games-results',{recursive:true});
 fs.writeFileSync('leaderboard-all-games-results/report.json',JSON.stringify(report,null,2));
 console.log('LEADERBOARD_ALL_GAMES '+JSON.stringify({total:report.total,passed:report.passed.length,failed:report.failed.length,skipped:report.skipped}));
 if(report.failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
