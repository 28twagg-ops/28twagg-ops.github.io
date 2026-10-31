// Open all 19 game cabinets in real Chromium, then actually click START on
// desktop and mobile. This complements synthetic game-over contract tests.
// It does NOT claim full multi-hour game balance / AI gameplay certification.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const games=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const startSelectors={
 'caked-up-cats':'#start-btn','creek-crosser':'#start-btn',
 'astrotype':'#start-btn','knight-flight':'#start-btn',
 'retro-kombat':'#start','logic-bomb':'#start-btn',
 'neon-chase':'.reboot-btn','robo-arena':'#startBtn',
 'millipede-chaos':'#btnStart','spyder-casino':'button[onclick^="startBJ"]',
};
const DEFAULT='#btn';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={total:38,passed:[],failed:[]};
 try{
  for(const device of [
   {name:'desktop',viewport:{width:1440,height:900},frame:'#gameDesktop'},
   {name:'mobile',viewport:{width:390,height:844},frame:'#gameMobile'}
  ]){
   for(const game of games){
    const ctx=await browser.newContext({viewport:device.viewport,hasTouch:device.name==='mobile'});
    const errors=[];
    await ctx.route(/firebaseio\.com/,route=>{
     route.fulfill({status:200,contentType:'application/json',body:'{}'});
    });
    const p=await ctx.newPage();
    p.on('pageerror',error=>errors.push(error.message));
    try{
     const response=await p.goto('http://127.0.0.1:8765/'+game.path,{
      waitUntil:'domcontentloaded',timeout:15000
     });
     assert.equal(response.status(),200);
     const frame=p.frameLocator(device.frame);
     const selector=startSelectors[game.slug]||DEFAULT;
     const start=frame.locator(selector).first();
     await start.waitFor({state:'visible',timeout:8000});
     await start.click({timeout:6500});
     await p.waitForTimeout(300);
     assert.ok(errors.length===0,'Script error: '+errors.join(' | '));
     const body=frame.locator('body');
     await body.waitFor({state:'attached'});
     const stats=await body.evaluate(()=>{
      const visible=el=>{
       const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
       return r.width>12&&r.height>12&&cs.display!=='none'&&cs.visibility!=='hidden';
      };
      return {visibleCanvases:[...document.querySelectorAll('canvas')].filter(visible).length,
        visibleUI:document.body.getBoundingClientRect().width};
     });
     if(game.slug!=='spyder-casino')assert.ok(stats.visibleCanvases>=1,
       'No visible game canvas after starting');
     assert.ok(stats.visibleUI>15,'Game iframe has no playable width');
     report.passed.push(game.slug+'/'+device.name);
     console.log('PASS PLAY START '+game.slug+' '+device.name);
    }catch(e){
     report.failed.push({slug:game.slug,device:device.name,error:String(e.message||e).slice(0,600),jsErrors:errors});
     console.log('FAIL PLAY START '+game.slug+' '+device.name+' '+String(e.message||e).slice(0,200));
    }finally{await ctx.close()}
   }
  }
 }finally{await browser.close()}
 fs.mkdirSync('start-smoke-results',{recursive:true});
 fs.writeFileSync('start-smoke-results/report.json',JSON.stringify(report,null,2));
 console.log('START_SMOKE '+JSON.stringify({total:report.total,passed:report.passed.length,failed:report.failed.length}));
 if(report.failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
