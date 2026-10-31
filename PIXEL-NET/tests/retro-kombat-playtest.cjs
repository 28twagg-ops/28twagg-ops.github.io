// Play the NEW original Retro Kombat game, including keyboard and touch.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const cases=[
  {name:'desktop',viewport:{width:1440,height:900},frame:'#gameDesktop',hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},frame:'#gameMobile',hasTouch:true}
 ];
 try{
  for(const view of cases){
   const context=await browser.newContext({viewport:view.viewport,hasTouch:view.hasTouch});
   await context.route(/firebaseio\.com/,route=>route.fulfill({
    status:200,contentType:'application/json',body:'{}'
   }));
   const errors=[];
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   try{
    const resp=await page.goto(
     'http://127.0.0.1:8765/games/retro-kombat-v2/wrapper-v2.html',
     {waitUntil:'domcontentloaded',timeout:15000});
    assert.equal(resp.status(),200);
    const frame=page.frameLocator(view.frame);
    await frame.locator('#start').waitFor({state:'visible',timeout:7000});
    await frame.locator('#start').click();
    await page.waitForFunction(selector=>{
     const iframe=document.querySelector(selector);
     return iframe?.contentDocument?.querySelector('#stage')?.dataset.state==='PLAY';
    },view.frame,{timeout:7000});
    assert.equal(await frame.locator('#stage').getAttribute('data-score'),'0');
    const before=await frame.locator('#arena').screenshot({timeout:10000});
    if(view.name==='desktop'){
     await frame.locator('#arena').click();
     await page.keyboard.down('ArrowRight');
     await page.waitForTimeout(1000);
     await page.keyboard.up('ArrowRight');
     for(let i=0;i<4;i++){
      await page.keyboard.press('KeyJ');await page.waitForTimeout(310);
     }
    }else{
     const move=frame.locator('[data-action="right"]');
     const punch=frame.locator('[data-action="punch"]');
     assert.equal(await move.isVisible(),true,'Touch D-pad absent');
     assert.equal(await punch.isVisible(),true,'Touch attack absent');
     await move.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
     await page.waitForTimeout(550);
     await move.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
     await punch.dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch'});
     await page.waitForTimeout(110);
     await punch.dispatchEvent('pointerup',{pointerId:2,pointerType:'touch'});
    }
    const after=await frame.locator('#arena').screenshot({timeout:10000});
    assert.equal(Buffer.compare(before,after)===0,false,'Rendered game did not respond to controls');
    assert.equal(await frame.locator('#stage').getAttribute('data-state'),'PLAY');
    assert.equal(errors.length,0,'Browser errors: '+errors.join('; '));
    console.log('PASS retro-kombat '+view.name+' start, controls, visible gameplay, no runtime errors');
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
