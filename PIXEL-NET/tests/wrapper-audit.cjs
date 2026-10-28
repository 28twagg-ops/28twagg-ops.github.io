// Browser QA for PIXEL-NET shared wrappers. No production leaderboard writes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const dir='wrapper-qa-results';fs.mkdirSync(dir,{recursive:true});
const games=[
 ['caked-up-cats','caked-up-cats'],['creek-crosser__embedA','creek-crosser'],
 ['astrotype-v2','astrotype'],['knight-flight-v2','knight-flight'],
 ['logic-bomb-v2','logic-bomb'],['neon-chase-v2','neon-chase'],
 ['robo-arena-v2','robo-arena'],['millipede-chaos-v3','millipede-chaos'],
 ['spyder-casino','spyder-casino'],['galaxy-swarm-2084','galaxy-swarm'],
 ['circuit-salvager','stack-drop'],['atariforce-hyperlane','atariforce'],
 ['kangaroo-climb','kangaroo'],
 ['dig-dug-delve','dig-dug'],['combat-cx2601','combat'],
 ['jungle-jr-rescue','jungle-jr'],['track-field-blitz','track-field'],
 ['orbit-siege','tower-rush']
];
const sizes=[
 {name:'desktop',width:1440,height:900,frame:'#gameDesktop'},
 {name:'mobile',width:390,height:844,frame:'#gameMobile'},
 {name:'tablet',width:820,height:1180,frame:'#gameMobile'}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const data=[];
 try{
  for(const size of sizes){
   const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.name!=='desktop',deviceScaleFactor:1});
   // Fake only READS to keep tests deterministic and never change user data.
   await ctx.route(/pixel-net-arcade-default-rtdb\.firebaseio\.com/i,route=>
     route.request().method()==='GET'
       ?route.fulfill({status:200,contentType:'application/json',body:'{}'})
       :route.abort());
   for(const [folder,slug] of games){
    const page=await ctx.newPage();
    const url='http://127.0.0.1:8765/games/'+folder+'/wrapper-v2.html';
    const errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))failed.push(r.status()+' '+r.url())});
    const item={game:slug,size:size.name,errors,failed};
    try{
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:12000});
     await page.locator(size.frame).waitFor({state:'visible',timeout:12000});
     await page.waitForTimeout(250);
     item.frames=await page.evaluate(()=>({
       desktop:document.getElementById('gameDesktop').getAttribute('src'),
       mobile:document.getElementById('gameMobile').getAttribute('src')
     }));
     item.frameBounds=await page.locator(size.frame).boundingBox();
     const inner=page.frameLocator(size.frame);
     item.canvasInfo=await inner.locator('body').evaluate(()=>({
       bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,
       innerW:innerWidth,innerH:innerHeight,
       canvases:[...document.querySelectorAll('canvas')].filter(c=>c.width>0&&c.height>0).map(c=>{
        const r=c.getBoundingClientRect();
        return {native:[c.width,c.height],screen:[+r.width.toFixed(2),+r.height.toFixed(2)],
          distortion:+((r.width/r.height)/(c.width/c.height)).toFixed(3),
          area:r.width*r.height};
       }).sort((a,b)=>b.area-a.area).slice(0,4)
     }));
     item.gameCanvas=item.canvasInfo.canvases[0]||null;
     const inactive=size.name==='desktop'?'mobile':'desktop';
     item.inactiveUnloaded=!item.frames[inactive];
     item.validFrame=item.frameBounds.width>30&&item.frameBounds.height>30&&
         item.frameBounds.width <= size.width+2 && item.frameBounds.height<=size.height+2;
     if(['millipede-chaos','caked-up-cats','logic-bomb','knight-flight','neon-chase'].includes(slug)&&size.name!=='tablet')
       await page.screenshot({path:dir+'/'+slug+'-'+size.name+'.png'});
    }catch(e){item.error=String(e.message||e).slice(0,600)}
    data.push(item);
    await page.close();
   }
   await ctx.close();
  }
  // Breakpoint regression: the old game is unloaded and the new one mounts.
  const context=await browser.newContext({viewport:{width:1450,height:900}});
  await context.route(/pixel-net-arcade-default-rtdb\.firebaseio\.com/i,route=>
    route.request().method()==='GET'
      ?route.fulfill({status:200,contentType:'application/json',body:'{}'})
      :route.abort());
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8765/games/neon-chase-v2/wrapper-v2.html',{waitUntil:'domcontentloaded'});
  const current=()=>page.evaluate(()=>({
    desktop:document.getElementById('gameDesktop').getAttribute('src'),
    mobile:document.getElementById('gameMobile').getAttribute('src'),
    overlap:(()=>{
      const rect=id=>document.getElementById(id).getBoundingClientRect();
      const left=rect('exitBtn'), mid=rect('gameBadge'), right=rect('playerBtn');
      return left.right>mid.left+1 || mid.right>right.left+1;
    })()
  }));
  let switchDesktop=await current();
  assert.ok(switchDesktop.desktop&&!switchDesktop.mobile,'desktop loads just one frame');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(150);
  let switchMobile=await current();
  assert.ok(!switchMobile.desktop&&switchMobile.mobile,'phone loads just one frame');
  assert.ok(!switchMobile.overlap,'mobile topbar title must not overlap buttons');
  await page.setViewportSize({width:1450,height:900});
  await page.waitForTimeout(150);
  let switchBack=await current();
  assert.ok(switchBack.desktop&&!switchBack.mobile,'return to desktop reactivates proper frame');
  const breakpointResults={switchDesktop,switchMobile,switchBack};
  await context.close();
  
  const summary={games:games.length,contexts:sizes.length,total:games.length*sizes.length,breakpoint:breakpointResults,
     errors:data.filter(x=>x.error||x.errors.length||x.failed.length).length,
     distortion:data.filter(x=>x.gameCanvas&&Math.abs(x.gameCanvas.distortion-1)>0.03).map(x=>({game:x.game,size:x.size,ratio:x.gameCanvas.distortion})),
     inactiveFrameLoaded:data.filter(x=>x.inactiveUnloaded===false).map(x=>x.game+':'+x.size)};
  fs.writeFileSync(dir+'/report.json',JSON.stringify({summary,cases:data},null,2));
  console.log(JSON.stringify(summary,null,2));
  // Baseline: fail only when a wrapper cannot be loaded, not because a game is currently stretched.
  assert.equal(data.filter(x=>x.error).length,0,'All wrappers should load');
  assert.equal(data.filter(x=>!x.validFrame).length,0,'All frames fit their viewport');
  assert.equal(data.filter(x=>!x.inactiveUnloaded).length,0,
    'Every hidden duplicate iframe must remain unloaded');
  assert.equal(data.filter(x=>x.gameCanvas&&Math.abs(x.gameCanvas.distortion-1)>0.03).length,0,
    'All custom-game primary canvases preserve their native proportions');
  assert.equal(data.filter(x=>x.failed.length||x.errors.length).length,0,
    'Local assets and iframe scripts must load without errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
