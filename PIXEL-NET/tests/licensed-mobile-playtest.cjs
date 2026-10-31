// Playwright phone emulation: actual touch taps, 10 games x Android Chromium + iPhone WebKit.
// Saves screenshots and a per-game error report. No production Firebase writes.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium,webkit,devices}=require('playwright');
const base=process.env.PIXELNET_TEST_URL||'http://127.0.0.1:8765/';
const output='licensed-mobile-playtest-results';fs.mkdirSync(output,{recursive:true});
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/licensed/catalog.json','utf8'));
const profiles=[{name:'android-chrome',engine:chromium,device:devices['Pixel 7']},
 {name:'iphone-safari',engine:webkit,device:devices['iPhone 13']}];
const results={base,passed:[],failed:[],warnings:[],screenshots:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function touch2048(frame){
 await frame.locator('.tile').first().waitFor({timeout:15000});
 const board=frame.locator('.game-container');
 await board.evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.left+r.width*.75,y=r.top+r.height*.5;
  const mk=(cx,cy)=>({identifier:1,target:el,clientX:cx,clientY:cy,
    screenX:cx,screenY:cy,pageX:cx,pageY:cy});
  const a=mk(x,y),b=mk(x-r.width*.5,y);
  const emit=(type,touches,changed)=>{
    const event=document.createEvent('Event');
    event.initEvent(type,true,true);
    Object.defineProperties(event,{
      touches:{value:touches},targetTouches:{value:touches},
      changedTouches:{value:changed}
    });
    el.dispatchEvent(event);
  };
  emit('touchstart',[a],[a]);
  emit('touchend',[],[b]);
 });
 await frame.locator('.restart-button').tap();
 assert.ok((await frame.locator('.tile').count())>=2,'2048 restart did not seed tiles');
 return 'touch swipe event and native touch restart';
}
async function touchOpenGames(frame,id){
 const play=frame.locator('#overlay-action');
 await play.waitFor({state:'visible',timeout:15000});
 await play.tap();
 await wait(170);
 assert.equal(await frame.locator('#overlay').evaluate(el=>el.hidden),true,'Play overlay remains open');
 if(id==='snake'){
  await frame.locator('.dpad [data-direction="up"]').tap();
  await wait(120);
  await frame.locator('.dpad [data-direction="left"]').tap();
 }else{
  await frame.locator('#board').tap();
  await wait(100);
  await frame.locator('#board').tap();
 }
 await frame.locator('#restart').tap();
 await wait(180);
 assert.equal((await frame.locator('#score').innerText()).trim(),'0','Restart failed to reset score');
 return 'tap play, native touch controls and touch restart';
}
async function touchLittleJS(page,frame,id){
 const play=frame.locator('button.ljs-menu-item').filter({hasText:/^PLAY$/i}).first();
 await play.waitFor({state:'visible',timeout:18000});
 // A native coordinate tap exercises the real mobile pointer path without
 // Playwright's locator actionability blocking on independently animated menus.
 const buttonBox=await play.boundingBox();
 assert.ok(buttonBox&&buttonBox.width>20&&buttonBox.height>15,'PLAY button has no hit target');
 await page.touchscreen.tap(buttonBox.x+buttonBox.width/2,buttonBox.y+buttonBox.height/2);
 if(id==='emoji-survivors'){
   const hero=frame.locator('button.ljs-menu-item[data-item-id^="hero-"]:not([disabled])').first();
   await hero.waitFor({state:'visible',timeout:5000});
   await hero.tap();
   const stage=frame.locator('button.ljs-menu-item[data-item-id^="stage-"]:not([disabled])').first();
   if(await stage.isVisible().catch(()=>false))await stage.tap();
 }
 await wait(300);
 const playing=await frame.locator('html').evaluate(()=>typeof isPlaying==='function'?isPlaying():null);
 if(playing!==null)assert.ok(playing,'PLAY did not start '+id);
 const canvas=frame.locator('canvas').first();
 const r=await canvas.boundingBox();
 assert.ok(r&&r.width>50&&r.height>50,'Canvas is not visible');
 await canvas.tap({position:{x:Math.min(70,r.width/2),y:Math.min(70,r.height/2)}});
 return 'tap PLAY and tap active game canvas';
}
async function exercise(browser,target,game){
 const landscape=['missile-defense','pong'].includes(game.id);
 const viewport=landscape?{width:844,height:390}:target.device.viewport;
 const context=await browser.newContext({...target.device,viewport,
   screen:landscape?viewport:target.device.screen,reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await context.newPage(),events={js:[],http:[],restricted:[],console:[]};
 page.on('pageerror',e=>events.js.push(e.message));
 page.on('console',m=>{if(m.type()==='error')events.console.push(m.text())});
 page.on('response',r=>{
  if(r.status()>=400&&new URL(r.url()).host===new URL(base).host)
   events.http.push(r.status()+' '+r.url());
 });
 page.on('request',r=>{
  if(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(r.url()))
   events.restricted.push(r.url());
 });
 const screenshot=output+'/'+target.name+'-'+game.id+'.png';
 try{
  const url=base+'licensed/play.html?game='+encodeURIComponent(game.id);
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response.status(),200);
  await page.waitForFunction(p=>document.querySelector('#game')?.contentWindow?.location?.pathname.endsWith('/'+p),
   game.path,{timeout:20000});
  const frame=page.frameLocator('#game');
  await frame.locator('html').waitFor({state:'attached',timeout:15000});
  const action=game.id==='2048'?await touch2048(frame):
    ['snake','flap'].includes(game.id)?await touchOpenGames(frame,game.id):
    await touchLittleJS(page,frame,game.id);
  const sizing=await page.evaluate(()=>({
   width:window.innerWidth,
   overflow:document.documentElement.scrollWidth-window.innerWidth,
   iframe:document.querySelector('#game')?.getBoundingClientRect().width
  }));
  if(sizing.overflow>24)results.warnings.push({game:game.id,device:target.name,overflow:sizing.overflow});
  assert.ok(sizing.iframe>100,'Iframe collapsed');
  assert.deepEqual(events.js,[],'JavaScript exceptions');
  assert.deepEqual(events.http,[],'HTTP resource failures');
  assert.deepEqual(events.restricted,[],'Unwanted Firebase requests');
  await page.screenshot({path:screenshot,fullPage:true,timeout:15000});
  results.passed.push({game:game.id,device:target.name,action,sizing,console:events.console});
  results.screenshots.push(screenshot);
 }catch(e){
  try{await page.screenshot({path:screenshot,fullPage:true,timeout:8000});
   results.screenshots.push(screenshot)}catch(_){}
  results.failed.push({game:game.id,device:target.name,error:String(e.message||e),events});
 }finally{await context.close()}
}
(async()=>{
 for(const target of profiles){
  const browser=await target.engine.launch({headless:true,args:target.engine===chromium?['--no-sandbox']:[]});
  try{
   for(const game of catalog){
    await exercise(browser,target,game);
    const n=results.passed.length+results.failed.length;
    console.log('MOBILE_PROGRESS '+n+'/20 '+target.name+' '+game.id);
   }
  }finally{await browser.close()}
 }
 fs.writeFileSync(output+'/report.json',JSON.stringify(results,null,2));
 console.log('MOBILE_RESULT '+results.passed.length+'/20 failed='+results.failed.length);
 if(results.failed.length){console.error(JSON.stringify(results.failed,null,2));process.exitCode=1}
})().catch(e=>{
 fs.writeFileSync(output+'/report.json',JSON.stringify(results,null,2));
 console.error(e);process.exitCode=1;
});
