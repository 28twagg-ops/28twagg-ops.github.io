// Smoke test Millipede Chaos via a LOCAL HTTP server. No database writes.
// Start server: python3 -m http.server 8765 --directory PIXEL-NET
// Run: node PIXEL-NET/tests/millipede-browser.cjs
'use strict';
const {chromium}=require('playwright'), assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='millipede-test-results';fs.mkdirSync(dir,{recursive:true});
const errors=[],results={desktop:{},mobile:{},errors};
const aspect = 400/640;
async function geometry(locator,label){
 const box=await locator.boundingBox();
 assert.ok(box&&box.width>50&&box.height>50,label+' visible');
 const actual=box.width/box.height;
 assert.ok(Math.abs(actual-aspect)<0.002,
   label+' distorted: '+box.width.toFixed(1)+' x '+box.height.toFixed(1)+' ratio='+actual.toFixed(4));
 return {width:+box.width.toFixed(2),height:+box.height.toFixed(2),ratio:+actual.toFixed(5)};
}
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
   await page.waitForTimeout(120);
   const standaloneSize=await geometry(page.locator('#c'),scenario.name+' native game');
   const scanlinesSize=await geometry(page.locator('#scanlines'),scenario.name+' scanlines');
   assert.ok(Math.abs(standaloneSize.width-scanlinesSize.width)<1,'scanlines align with game');
   if(scenario.name==='desktop'){
     await page.setViewportSize({width:520,height:900});
     await page.waitForTimeout(150);
     results.desktop.resized=await geometry(page.locator('#c'),'resized 520x900');
   }
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
   results[scenario.name]={...results[scenario.name],hud:bg,background:wrapBg,started:true,canvas:standaloneSize};
   await context.close();
  }
  // Validate the actual shared wrapper on desktop and mobile.
  // The wrapper can show external Firebase errors; geometry is checked separately.
  for(const scenario of [
    {name:'wrapperDesktop',viewport:{width:1450,height:900},frame:'#gameDesktop'},
    {name:'wrapperMobile',viewport:{width:390,height:844},frame:'#gameMobile'}
  ]){
    const context=await browser.newContext({viewport:scenario.viewport});
    const page=await context.newPage();
    const runtime=[];
    page.on('pageerror',e=>runtime.push(e.message));
    await page.goto('http://127.0.0.1:8765/games/millipede-chaos-v3/wrapper-v2.html',
      {waitUntil:'domcontentloaded'});
    const game=page.frameLocator(scenario.frame);
    await game.locator('#c').waitFor({state:'visible',timeout:12000});
    await page.waitForTimeout(220);
    const canvas=await geometry(game.locator('#c'),scenario.name+' embedded canvas');
    const parent=await page.locator(scenario.frame).boundingBox();
    assert.ok(parent?.width>40 && parent?.height>40,'iframe is visible');
    assert.ok(canvas.width<=parent.width+1&&canvas.height<=parent.height+1,'embedded game fits frame');
    assert.deepEqual(runtime,[],'no wrapper JS exceptions');
    results[scenario.name]={canvas,frame:{width:parent.width,height:parent.height}};
    await page.screenshot({path:dir+'/'+scenario.name+'.png'});
    await context.close();
  }
  assert.deepEqual(errors,[],'No uncaught errors or console errors');
  fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));
  console.log('PASS: Millipede starts, canvas keeps 5:8 ratio standalone + embedded, resize, desktop/mobile controls');
 }finally{await browser.close()}
})().catch(e=>{results.failure=String(e.stack||e);fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));console.error(e);process.exitCode=1;});
