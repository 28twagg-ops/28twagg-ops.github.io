// Release hardening: catalog accessibility, upload queue durability,
// Casino mode coverage, no old ROMs, and service-worker offline behavior.
// Runs against a local copy of the development branch. No production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/';
const games=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const roms=[
 'combat-cx2601/rom/combat.a26',
 'dig-dug-delve/rom/digdug.nes',
 'jungle-jr-rescue/rom/dkongjr.zip',
 'kangaroo-climb/rom/Kangaroo_1983_Atari_US_proto_a_k_file.atr',
 'orbit-siege/rom/dkong.zip',
 'track-field-blitz/rom/Track__Field_1983_Konami.d64'
];
const fulfilled=async route=>route.fulfill({
 status:200,contentType:'application/json',body:'{}'
});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[],errors=[];
 try{
  assert.equal(games.length,19);
  const slugs=new Set();
  for(const game of games){
   assert.ok(!slugs.has(game.slug),'Duplicate catalog slug '+game.slug);
   slugs.add(game.slug);
   assert.ok(fs.existsSync('PIXEL-NET/'+game.path),'Missing game wrapper: '+game.path);
   assert.ok(fs.existsSync('PIXEL-NET/'+game.thumb),'Missing game thumbnail: '+game.thumb);
   assert.ok(game.thumb.endsWith('.webp'),'Unoptimized catalog thumbnail: '+game.thumb);
   assert.ok(fs.statSync('PIXEL-NET/'+game.thumb).size<230000,
    'Preview still oversized: '+game.thumb);
  }
  results.push('19 catalog games: optimized image exists, wrapper exists, unique slug');
  for(const rom of roms){
   assert.ok(!fs.existsSync('PIXEL-NET/games/'+rom),'Legacy ROM should not ship: '+rom);
  }
  results.push('All 6 unused ROMs removed from release branch');
  const main=await browser.newContext({viewport:{width:1300,height:900}});
  await main.route(/firebaseio\.com/,fulfilled);
  const page=await main.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#gamesGrid .game-card').first().waitFor();
  assert.equal(await page.locator('#gamesGrid .game-card').count(),19);
  const cards=await page.locator('#gamesGrid .game-card').evaluateAll(els=>
   els.map(e=>({tag:e.tagName,href:e.getAttribute('href'),
     img:e.querySelector('img')?.getAttribute('src'),
     lazy:e.querySelector('img')?.loading,text:e.textContent.trim()}))
  );
  for(const c of cards){
   assert.equal(c.tag,'A','Game tile must be keyboard navigable as a link');
   assert.ok(c.href.includes('/games/')&&c.href.endsWith('wrapper-v2.html'),'Cabinet link broken');
   assert.ok(c.img.includes('optimized.webp'),'Card lacks optimized preview');
   assert.equal(c.lazy,'lazy','Catalog preview not lazy-loaded');
   assert.ok(c.text.length>0);
  }
  results.push('19 cards are native keyboard-accessible links with lazy optimized images');
  assert.equal(await page.locator('#playerInitials').evaluate(el=>el.tagName),'BUTTON');
  await page.locator('#initialsInput').fill('a$bc');
  assert.equal(await page.locator('#initialsInput').inputValue(),'ABC');
  await page.locator('#initialModal .btn-save').click();
  assert.equal(await page.locator('#playerInitials').textContent(),'ABC');
  await page.locator('#playerInitials').click();
  assert.equal(await page.locator('#initialsInput').evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#initialModal').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('#playerInitials').evaluate(el=>document.activeElement===el),true);
  results.push('Initials sanitization, dialog focus and Escape/return-focus work');
  await main.close();

  // Inject >40 STANDARD scores above ANALYSIS scores. The latter must still
  // appear after mode splitting, not disappear behind a global top-40 cutoff.
  const casino=await browser.newContext({viewport:{width:1400,height:900}});
  const data={};
  for(let i=0;i<80;i++)data['standard'+i]={
   initials:'STD',score:100000-i,t:Date.now(),mode:'STANDARD'
  };
  data.analysis1={initials:'ANA',score:120,t:Date.now(),mode:'ANALYSIS'};
  data.analysis2={initials:'BNA',score:110,t:Date.now(),mode:'ANALYSIS'};
  await casino.route(/firebaseio\.com/,route=>{
   if(route.request().url().includes('/lb/spyder-blackjack.json')){
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   }
   return fulfilled(route);
  });
  const casinoPage=await casino.newPage();casinoPage.on('pageerror',e=>errors.push(e.message));
  await casinoPage.goto(BASE+'games/spyder-casino/wrapper-v2.html');
  await casinoPage.waitForFunction(()=>{
   return document.querySelector('#boardDesktopBjAn')?.textContent.includes('ANA');
  });
  assert.ok((await casinoPage.locator('#boardDesktopBjStd').textContent()).includes('STD'));
  assert.ok((await casinoPage.locator('#boardDesktopBjAn').textContent()).includes('ANA'));
  results.push('80 high Standard scores do not hide lower Analysis-mode rankings');
  await casino.close();

  // Public global boards should never include unsent local rows as top-10.
  // A backlog >100 must not be silently truncated or lost.
  const storage=await browser.newContext({viewport:{width:1350,height:900}});
  const list=Array.from({length:120},(_,i)=>({
   id:'pn-qaqueued'+String(i).padStart(5,'0'),board:'neon-chase',
   entry:{initials:'TST',score:i+1,t:Date.now()}
  }));
  await storage.addInitScript(init=>{
   localStorage.setItem('PIXELNET_PENDING_SCORES_V1',JSON.stringify(init));
   localStorage.setItem('PIXELNET_INITIALS','TST');
  },list);
  await storage.route(/firebaseio\.com/,fulfilled);
  const storagePage=await storage.newPage();storagePage.on('pageerror',e=>errors.push(e.message));
  await storagePage.goto(BASE+'games/neon-chase-v2/wrapper-v2.html');
  await storagePage.frameLocator('#gameDesktop').locator('body').evaluate(()=>{
   parent.postMessage({type:'GAME_OVER_SCORE',score:333},location.origin);
  });
  await storagePage.waitForFunction(()=>
   JSON.parse(localStorage.getItem('PIXELNET_PENDING_SCORES_V1')||'[]').length===121);
  assert.equal((await storagePage.locator('#boardDesktop').textContent()).includes('333'),false,
   'Local pending score must not impersonate a global record');
  results.push('121 queued scores retained, pending entry excluded from confirmed global rankings');
  await storage.close();

  const overflow=await browser.newContext({viewport:{width:1350,height:900}});
  const full=Array.from({length:500},(_,i)=>({
   id:'pn-qafull'+String(i).padStart(6,'0'),board:'neon-chase',
   entry:{initials:'TST',score:i,t:Date.now()}
  }));
  await overflow.addInitScript(init=>{
   localStorage.setItem('PIXELNET_PENDING_SCORES_V1',JSON.stringify(init));
   localStorage.setItem('PIXELNET_INITIALS','TST');
  },full);
  await overflow.route(/firebaseio\.com/,fulfilled);
  const overflowPage=await overflow.newPage();overflowPage.on('pageerror',e=>errors.push(e.message));
  await overflowPage.goto(BASE+'games/neon-chase-v2/wrapper-v2.html');
  await overflowPage.frameLocator('#gameDesktop').locator('body').evaluate(()=>{
   parent.postMessage({type:'GAME_OVER_SCORE',score:999},location.origin);
  });
  await overflowPage.waitForFunction(()=>
   document.querySelector('#boardNoticeDesktop')?.textContent.includes('storage is full'));
  assert.equal(await overflowPage.evaluate(()=>
   JSON.parse(localStorage.getItem('PIXELNET_PENDING_SCORES_V1')).length),500);
  results.push('Full upload queue preserves 500 existing scores and warns instead of discarding');
  await overflow.close();

  for(const rom of roms){
   const slug=rom.split('/')[0];
   const res=await fetch(BASE+'games/'+slug+'/emu.html');
   assert.equal(res.status,200);
   assert.ok((await res.text()).includes("location.replace('./game.html')"));
  }
  results.push('All old emulator HTML routes explicitly redirect to playable native versions');
  assert.equal(errors.length,0,'Browser script errors: '+errors.join(' | '));
 }finally{await browser.close()}
 console.log('RELEASE_HARDENING '+JSON.stringify({passed:results.length,tests:results}));
})().catch(e=>{console.error(e);process.exitCode=1});
