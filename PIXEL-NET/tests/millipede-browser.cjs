// Smoke test Millipede Chaos via a LOCAL HTTP server. No database writes.
// Start server: python3 -m http.server 8765 --directory PIXEL-NET
// Run: node PIXEL-NET/tests/millipede-browser.cjs
'use strict';
const {chromium}=require('playwright'), assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='millipede-test-results';fs.mkdirSync(dir,{recursive:true});
const errors=[],results={desktop:{},mobile:{},errors};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const scenario of [
    {name:'desktop',options:{viewport:{width:1100,height:800}}},
    {name:'mobile',options:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
  ]){
   const context=await browser.newContext(scenario.options),page=await context.newPage();
   page.on('pageerror',e=>errors.push(scenario.name+': '+e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(scenario.name+': '+m.text())});
   await page.goto('http://127.0.0.1:8765/games/millipede-chaos-v3/game.html',{waitUntil:'domcontentloaded'});
   assert.ok(await page.locator('#btnStart').isVisible(),'start button visible');
   const bg=await page.locator('#hud').evaluate(el=>getComputedStyle(el).backgroundColor);
   const wrapBg=await page.locator('#wrap').evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.notEqual(bg,'rgb(255, 255, 255)','HUD is no longer white');
   assert.notEqual(wrapBg,'rgba(0, 0, 0, 0)','Game background is opaque');
   await page.locator('#btnStart').click();
   assert.ok(await page.locator('#overlay').evaluate(el=>el.classList.contains('hidden')),'Game starts');
   if(scenario.name==='desktop'){
     await page.keyboard.down('ArrowRight');
     await page.keyboard.down(' ');
     await page.waitForTimeout(350);
     await page.keyboard.up('ArrowRight');
     await page.keyboard.up(' ');
   }else{
     const el=page.locator('#c'),box=await el.boundingBox();
     assert.ok(box&&box.width>100,'canvas visible');
     await el.click({position:{x:Math.min(box.width-10,box.width/2),y:Math.max(30,box.height-90)}});
     await page.waitForTimeout(200);
   }
   await page.screenshot({path:dir+'/'+scenario.name+'.png'});
   results[scenario.name]={hud:bg,background:wrapBg,started:true};
   await context.close();
  }
  assert.deepEqual(errors,[],'No uncaught errors or console errors');
  fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));
  console.log('PASS: Millipede Chaos starts, dark HUD, desktop controls, mobile pointer interaction');
 }finally{await browser.close()}
})().catch(e=>{results.failure=String(e.stack||e);fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));console.error(e);process.exitCode=1;});
