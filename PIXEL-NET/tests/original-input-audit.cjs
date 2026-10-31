// PIXEL-NET full original-catalog browser health and input smoke.
// Runs real desktop Chromium, Android Chromium touch and iOS WebKit emulation.
// Does NOT claim a completed game playthrough or submit any real production scores.
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium, webkit, devices } = require('playwright');
const BASE = 'http://127.0.0.1:8765/';
const catalog = JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8')).filter(x => !x.licensed);
const profiles = [
 {name:'desktop-chromium',browser:chromium,settings:{viewport:{width:1440,height:900}},frame:'#gameDesktop'},
 {name:'android-chromium',browser:chromium,settings:devices['Pixel 7'],frame:'#gameMobile'},
 {name:'iphone-webkit',browser:webkit,settings:devices['iPhone 13'],frame:'#gameMobile'}
];
const nativeRepairs = new Set(['dig-dug-delve','combat-cx2601','jungle-jr-rescue','track-field-blitz','orbit-siege']);
const output = 'original-input-audit-results';
fs.mkdirSync(output,{recursive:true});
const results={total:catalog.length*profiles.length,passed:[],failed:[],warnings:[],coverage:
 'Real browser launch, visible game iframe, key/touch attempts, script and local resource failures, layout, screenshot. Not complete gameplay or production database verification.'};
assert.equal(catalog.length,18,'Unexpected original public catalog size');
async function exercise(browser,profile,game){
 const context=await browser.newContext({...profile.settings,serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[],http=[],requests=[],inputs=[];
 // Mock all database traffic to avoid accidentally changing the public score database.
 await context.route(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/,async route=>{
   const req=route.request();
   requests.push(req.method()+' '+req.url());
   if(req.method()==='GET')await route.fulfill({status:200,contentType:'application/json',body:'null'});
   else await route.fulfill({status:403,contentType:'application/json',body:'{"error":"QA blocked write"}'});
 });
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',res=>{
   if(res.url().startsWith(BASE)&&res.status()>=400&&!res.url().split('?')[0].endsWith('/favicon.ico'))
     http.push(res.status()+' '+res.url());
 });
 const evidence={game:game.name,slug:game.slug,device:profile.name,inputs,errors,http,requests};
 try {
   const nav=await page.goto(BASE+game.path,{waitUntil:'domcontentloaded',timeout:25000});
   assert.equal(nav.status(),200,'Wrapper route failed');
   const iframe=page.locator(profile.frame);
   await iframe.waitFor({state:'attached',timeout:12000});
   await page.waitForFunction(id=>{
     const frame=document.querySelector(id);
     return frame&&frame.contentWindow&&frame.contentWindow.location.href!=='about:blank';
   },profile.frame,{timeout:14000});
   const frameHandle=await iframe.elementHandle();
   const frame=await frameHandle.contentFrame();
   assert.ok(frame,'Missing game frame');
   evidence.frameURL=frame.url();
   await page.waitForTimeout(900);
   const canvas=frame.locator('canvas').first();
   const hasCanvas=await canvas.count()>0;
   const body=frame.locator('body');
   const play=frame.locator('#btn, #btnStart, #startBtn, #startButton, button:has-text("START"), button:has-text("PLAY")').first();
   if(await play.count()&&await play.isVisible().catch(()=>false)){
     await play.click({timeout:2500}).then(()=>inputs.push('click start/play')).catch(()=>{});
   }
   if(profile.name==='desktop-chromium'){
     await iframe.focus().catch(()=>{});
     for(const key of ['Enter','Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA']){
       await page.keyboard.press(key).then(()=>inputs.push('key '+key)).catch(()=>{});
     }
   }else{
     const rect=(hasCanvas?await canvas.boundingBox().catch(()=>null):null) ||
       await iframe.boundingBox();
     if(rect&&rect.width>30&&rect.height>30){
       const x=rect.x+Math.min(rect.width*.5,Math.max(16,rect.width-16));
       const y=rect.y+Math.min(rect.height*.5,Math.max(16,rect.height-16));
       await page.touchscreen.tap(x,y).then(()=>inputs.push('physical simulated touch')).catch(()=>{});
     }
     if(nativeRepairs.has(game.slug)){
       const left=frame.locator('[data-pn-touch="left"]');
       await left.waitFor({state:'visible',timeout:5000});
       await frame.evaluate(()=>{
         window.__pnTouchTestKeys=0;
         window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')window.__pnTouchTestKeys++;});
       });
       await left.tap({timeout:4000});
       await frame.waitForFunction(()=>window.__pnTouchTestKeys>0,{timeout:4000});
       inputs.push('verified native touch left emits ArrowLeft keydown');
     }
     const arrow=frame.locator('[data-direction="left"], #btnLeft, .dpad button').first();
     if(await arrow.count()&&await arrow.isVisible().catch(()=>false)){
       await arrow.tap({timeout:2500}).then(()=>inputs.push('touch direction')).catch(()=>{});
     }
     const tabs=page.locator('[data-tab]');
     if(await tabs.count()){
       await page.locator('[data-tab="howto"]').dispatchEvent('click');
       assert.equal(await page.locator('#view-howto').isVisible(),true,'Mobile How To tab');
       await page.locator('[data-tab="board"]').dispatchEvent('click');
       assert.equal(await page.locator('#view-board').isVisible(),true,'Mobile Scores tab');
       await page.locator('[data-tab="game"]').dispatchEvent('click');
       assert.equal(await page.locator('#view-game').isVisible(),true,'Mobile Game tab');
       inputs.push('How To / Scores / Game tabs');
     }
   }
   await page.waitForTimeout(450);
   evidence.hasCanvas=hasCanvas;
   evidence.canvasCount=await frame.locator('canvas').count();
   evidence.pageSize=await page.evaluate(()=>({
      viewportWidth:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
      gameRect:document.querySelector('#gameDesktop')?.getBoundingClientRect().toJSON()
   }));
   if(evidence.pageSize.overflow>24)results.warnings.push({game:game.slug,device:profile.name,
     reason:'Horizontal wrapper overflow '+evidence.pageSize.overflow+'px'});
   // Permission errors in emulator sandboxes can coexist with rendered games;
   // retain them as warnings until deeper gameplay establishes functionality.
   if(errors.length) throw Error('JS exceptions: '+errors.join(' | '));
   assert.deepEqual(http,[],'Missing local resources');
   const shot=output+'/'+profile.name+'-'+game.slug+'.png';
   await page.screenshot({path:shot,timeout:15000});
   evidence.screenshot=shot;
   results.passed.push(evidence);
 }catch(e){
   evidence.failure=String(e.message||e);
   results.failed.push(evidence);
   try{await page.screenshot({path:output+'/FAILED-'+profile.name+'-'+game.slug+'.png',timeout:6000})}catch(_){}
 }finally{
   await context.close();
   fs.writeFileSync(output+'/report.json',JSON.stringify(results,null,2));
 }
}
(async()=>{
 for(const profile of profiles){
   const browser=await profile.browser.launch({headless:true,args:profile.browser===chromium?['--no-sandbox']:[]});
   try{
     for(const g of catalog){
       await exercise(browser,profile,g);
       console.log('ORIGINAL_PROGRESS '+profile.name+' '+g.slug+' passed='+results.passed.length+' failed='+results.failed.length);
     }
   }finally{await browser.close()}
 }
 console.log('ORIGINAL_RESULT '+results.passed.length+'/'+results.total+' failed='+results.failed.length+' warnings='+results.warnings.length);
 if(results.failed.length){console.error(JSON.stringify(results.failed,null,2));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
