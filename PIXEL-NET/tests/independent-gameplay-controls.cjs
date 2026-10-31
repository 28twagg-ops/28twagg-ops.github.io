// Narrow evidence-backed gameplay regression checks (simulated browsers only).
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,webkit,devices}=require('playwright');
const BASE='http://127.0.0.1:8765/';
const OUT='targeted-gameplay-evidence';fs.mkdirSync(OUT,{recursive:true});
const results=[];
async function open(browser,slug,opts){
 const context=await browser.newContext({...opts,serviceWorkers:'block'});
 await context.route(/firebaseio\.com/,r=>r.fulfill({status:r.request().method()==='GET'?200:403,
  contentType:'application/json',body:r.request().method()==='GET'?'null':'{"error":"qa blocked"}'}));
 const page=await context.newPage();
 const path=({creek:'creek-crosser__embedA',cats:'caked-up-cats',astro:'astrotype-v2',casino:'spyder-casino'})[slug];
 await page.goto(BASE+'games/'+path+'/wrapper-v2.html',{waitUntil:'domcontentloaded',timeout:20000});
 const fid=opts.hasTouch?'#gameMobile':'#gameDesktop';
 if(opts.hasTouch && slug==='astro')await page.locator('.pn-mobile-gate button').click();
 await page.waitForFunction(id=>!!document.querySelector(id)?.getAttribute('src')&&
  document.querySelector(id).contentWindow?.location.href!=='about:blank',fid,{timeout:15000});
 return {context,page,frame:page.frameLocator(fid)};
}
async function run(label,fn){
 try{const evidence=await fn();results.push({label,result:'pass',evidence});console.log('TARGETED_PASS '+label+' '+JSON.stringify(evidence));}
 catch(err){results.push({label,result:'fail',error:String(err.message||err)});console.error('TARGETED_FAIL '+label+' '+String(err.stack||err));}
}
(async()=>{
 const ios=await webkit.launch({headless:true});
 const desktop=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  await run('Creek Crosser touch tap moves player and survives rotation',async()=>{
   const s=await open(ios,'creek',devices['iPhone 13']);
   try{
    await s.frame.locator('#start-btn').click();
    const state=await s.frame.locator('#gameCanvas').evaluate(el=>{
     const before={x:player.gridX,y:player.gridY,running:gameHasStarted};
     const r=el.getBoundingClientRect(),x=r.x+r.width*.5,y=r.y+r.height*.5;
     el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'touch',clientX:x,clientY:y}));
     el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'touch',clientX:x,clientY:y}));
     return {before,after:{x:player.gridX,y:player.gridY}};
    });
    assert.equal(state.before.running,true);
    assert.equal(state.after.y,state.before.y-1,'Tap did not advance one row');
    assert.equal(await s.frame.locator('#mobile-controls').isVisible(),false,'D-pad covers game');
    await s.page.setViewportSize({width:844,height:390});
    await s.page.waitForTimeout(180);
    const doc=await s.page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(doc.scroll<=doc.w+6,'Landscape horizontal overflow');
    return {state,doc};
   }finally{await s.context.close();}
  });
  await run('Caked Up Cats all three selection cards fit mobile canvas',async()=>{
   const s=await open(ios,'cats',devices['iPhone 13']);
   try{
    const sizes=await s.frame.locator('#char-select').evaluate(el=>{
      const p=el.getBoundingClientRect();return {parent:{left:p.left,right:p.right},
       cards:[...el.children].map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})};
    });
    assert.equal(sizes.cards.length,3);
    for(const c of sizes.cards)assert.ok(c.left>=sizes.parent.left-3&&c.right<=sizes.parent.right+3,'Clipped cat card');
    return sizes;
   }finally{await s.context.close();}
  });
  await run('Astrotype Wave HUD does not overlay Shields',async()=>{
   const s=await open(ios,'astro',devices['iPhone 13']);
   try{
    const x=await s.frame.locator('#level-display').evaluate(el=>{
      let a=el.getBoundingClientRect(),b=document.getElementById('lives-display').getBoundingClientRect();
      return {wave:[a.left,a.top,a.right,a.bottom],shields:[b.left,b.top,b.right,b.bottom],
       overlap:!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)};
    });
    assert.equal(x.overlap,false,'Wave text still overlays Shields');
    return x;
   }finally{await s.context.close();}
  });
  await run('Spyder Casino mobile shortcuts start Blackjack and place a bet',async()=>{
   const s=await open(ios,'casino',devices['iPhone 13']);
   try{
    await s.frame.getByRole('button',{name:'BJ STANDARD',exact:true}).click();
    await s.frame.getByRole('button',{name:'+$5',exact:true}).click();
    await s.frame.getByRole('button',{name:'DEAL',exact:true}).click();
    const x=await s.frame.locator('body').evaluate(()=>({
      phase:bjPhase,bet:bjBet,screen:document.querySelector('.screen.active')?.id,
      focused:document.activeElement?.tagName
    }));
    assert.equal(x.screen,'bjScreen');
    assert.ok(x.bet>=5,'Bet was not applied');
    assert.ok(['play','done'].includes(x.phase),'Deal did not change Blackjack state');
    assert.notEqual(x.focused,'INPUT','iPhone keyboard was forced open');
    return x;
   }finally{await s.context.close();}
  });
  await run('Spyder Casino desktop keyboard selection remains available',async()=>{
   const s=await open(desktop,'casino',{viewport:{width:1440,height:900},hasTouch:false});
   try{
    await s.frame.locator('body').press('1');
    const phase=await s.frame.locator('body').evaluate(()=>({phase:bjPhase,screen:document.querySelector('.screen.active')?.id}));
    assert.equal(phase.screen,'bjScreen');assert.equal(phase.phase,'bet');
    return phase;
   }finally{await s.context.close();}
  });
 }finally{await Promise.all([ios.close(),desktop.close()]);}
 fs.writeFileSync(OUT+'/report.json',JSON.stringify(results,null,2));
 console.log('TARGETED_RESULT '+results.filter(x=>x.result==='pass').length+'/'+results.length);
 if(results.some(x=>x.result==='fail'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
