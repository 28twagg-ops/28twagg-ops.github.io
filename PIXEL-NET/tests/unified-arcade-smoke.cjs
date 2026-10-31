// PIXEL-NET all-in-one arcade floor regression.
// Checks 19 original cabinets + ten imported games inside the SAME cabinet shell.
// Licensed games must never submit to the shared Firebase leaderboard.
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs');
const {chromium,devices}=require('playwright');
const BASE='http://127.0.0.1:8765/';
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const imported=JSON.parse(fs.readFileSync('PIXEL-NET/licensed/catalog.json','utf8'));
const out='unified-arcade-results';fs.mkdirSync(out,{recursive:true});
const report={total:catalog.length,original:catalog.filter(g=>!g.licensed).length,
  imported:catalog.filter(g=>g.licensed).length,runs:[],failures:[]};
assert.equal(report.original,18,'Expected 18 original playable titles after archiving the placeholder');
assert.equal(report.imported,10);
assert.equal(new Set(catalog.map(x=>x.slug)).size,catalog.length);
assert.deepEqual(catalog.filter(x=>x.licensed).map(x=>x.slug),
  imported.map(x=>'licensed-'+x.id));
assert.ok(catalog.find(x=>x.featured)?.slug==='spyder-casino',
  'Original featured game must remain featured');
for(const g of catalog.filter(x=>x.licensed)){
 assert.ok(g.path.startsWith('games/licensed-')&&g.path.endsWith('/wrapper-v2.html'));
 assert.ok(g.thumb.startsWith('assets/licensed-')&&g.thumb.endsWith('.svg'));
 assert.ok(fs.existsSync('PIXEL-NET/'+g.path),'Missing shared game wrapper');
 assert.ok(fs.existsSync('PIXEL-NET/'+g.thumb),'Missing game thumbnail');
 assert.ok(fs.readFileSync('PIXEL-NET/'+g.path,'utf8')
   .includes('../../wrapper/shell.js'),'Game does not use shared PIXEL-NET cabinet');
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const home=await browser.newPage();
  await home.addInitScript(()=>localStorage.setItem('playerInitials','QA1'));
  await home.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
  await home.locator('.game-card').first().waitFor();
  await home.waitForFunction(expected=>document.querySelectorAll('.game-card').length===expected,catalog.length);
  assert.equal(await home.locator('.game-card').count(),catalog.length);
  assert.equal(await home.locator('.licensedTag').count(),10);
  assert.equal(await home.locator('#featuredTitle').innerText(),'SPYDER CASINO');
  await home.locator('#searchBar').fill('Frank Force');
  await home.waitForFunction(()=>document.querySelectorAll('.game-card').length===7);
  await home.locator('#searchBar').fill('2048');
  await home.waitForFunction(()=>document.querySelectorAll('.game-card').length===1);
  await home.locator('#searchBar').fill('');
  await home.waitForFunction(expected=>document.querySelectorAll('.game-card').length===expected,catalog.length);
  const click=home.locator('.game-card').filter({hasText:'2048'}).first();
  await click.click();
  await home.waitForURL('**/games/licensed-2048/wrapper-v2.html');
  await home.close();
  // The previous Millipede build referenced /js/engine.js, a missing file.
  // Verify the self-contained game starts and renders without missing assets.
  const millipede=await browser.newPage();
  const millErrors=[];
  millipede.on('pageerror',e=>millErrors.push('JS '+e.message));
  millipede.on('response',r=>{
    if(r.url().startsWith(BASE)&&r.status()>=400&&!r.url().endsWith('/favicon.ico'))
      millErrors.push('HTTP '+r.status()+' '+r.url());
  });
  await millipede.goto(BASE+'games/millipede-chaos-v3/wrapper-v2.html',
    {waitUntil:'domcontentloaded'});
  const millFrame=millipede.frameLocator('#gameDesktop');
  const startMill=millFrame.locator('#btnStart');
  await startMill.waitFor({state:'visible',timeout:9000});
  await startMill.click();
  await millFrame.locator('#overlay.hidden').waitFor({state:'attached',timeout:6000});
  await millipede.waitForTimeout(700);
  const canvasDims=await millFrame.locator('canvas#c').evaluate(c=>({w:c.width,h:c.height}));
  assert.ok(canvasDims.w>200&&canvasDims.h>200,'Millipede canvas did not initialize');
  assert.deepEqual(millErrors,[],'Millipede must not load missing files or crash after START');
  report.runs.push({name:'MILLIPEDE CHAOS',device:'gameplay',result:'pass'});
  await millipede.close();

  const profiles=[
   {name:'desktop',settings:{viewport:{width:1440,height:900}},frame:'#gameDesktop'},
   {name:'mobile',settings:devices['iPhone 13'],frame:'#gameMobile'}
  ];
  for(const profile of profiles){
   for(const game of catalog.filter(g=>g.licensed)){
    const context=await browser.newContext({...profile.settings,serviceWorkers:'block'});
    const page=await context.newPage();
    const errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400 && !r.url().split('?')[0].endsWith('/favicon.ico'))
      errors.push('HTTP '+r.status()+' '+r.url())});
    page.on('request',r=>{if(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/.test(r.url()))
      requests.push(r.method()+' '+r.url())});
    try{
      const res=await page.goto(BASE+game.path,{waitUntil:'domcontentloaded',timeout:20000});
      assert.equal(res.status(),200);
      assert.equal(await page.locator('h3').filter({hasText:'How To Play'}).count(),1);
      const wrapper=await page.evaluate(()=>window.PX_WRAPPER);
      assert.equal(wrapper.slug,game.slug);
      assert.equal(wrapper.licensed?.creator,game.creator);
      const frame=page.locator(profile.frame);
      await page.waitForFunction(({id,end})=>{
       const f=document.querySelector(id);
       return f&&f.contentWindow&&f.contentWindow.location.pathname.endsWith(end);
      },{id:profile.frame,end:'/licensed/'+imported.find(i=>'licensed-'+i.id===game.slug).path},
      {timeout:18000});
      if(profile.name==='mobile'){
       await page.locator('[data-tab=howto]').click();
       assert.equal(await page.locator('#view-howto').isVisible(),true);
       await page.locator('[data-tab=board]').click();
       assert.equal(await page.locator('#view-board').isVisible(),true);
       assert.ok((await page.locator('#view-board').innerText()).includes(game.creator));
       await page.locator('[data-tab=game]').dispatchEvent('click');
       assert.equal(await page.locator('#view-game').isVisible(),true);
      }else{
       assert.ok((await page.locator('.shell > .panel.leaderboard').innerText()).includes(game.creator));
      }
      assert.ok((await page.locator('a').filter({hasText:'Read original'}).first()
        .getAttribute('href')).includes('/licensed/vendors/'));
      // Even if a third-party iframe fakes a score event, licensed titles
      // never create PIXEL-NET leaderboard entries or remote write requests.
      await frame.evaluate(el=>el.contentWindow.parent.postMessage(
        {type:'GAME_OVER_SCORE',score:999999,slug:'spyder-casino'},location.origin));
      await page.waitForTimeout(120);
      const local=await page.evaluate(slug=>localStorage.getItem('LB_'+slug),game.slug);
      assert.equal(local,null,'Licensed game unexpectedly saved a shared wrapper score');
      assert.deepEqual(requests,[],'Licensed game contacted Firebase');
      assert.deepEqual(errors,[],'Unexpected JS or resource errors');
      report.runs.push({name:game.name,device:profile.name,result:'pass'});
      if(['licensed-2048','licensed-pong'].includes(game.slug))
       await page.screenshot({path:out+'/'+profile.name+'-'+game.slug+'.png'});
    }catch(e){
      report.failures.push({name:game.name,device:profile.name,error:String(e.stack||e),
        requests,errors});
    }finally{await context.close();}
   }
  }
  // Existing 19 original wrapper routes remain valid after catalog and shell changes.
  for(const g of catalog.filter(x=>!x.licensed)){
   const r=await browser.newPage();
   try{
    const response=await r.goto(BASE+g.path,{waitUntil:'domcontentloaded',timeout:12000});
    assert.equal(response.status(),200,'Original wrapper broken: '+g.slug);
    await r.locator('#gameDesktop').waitFor();
    report.runs.push({name:g.name,device:'desktop-original',result:'pass'});
   }catch(e){report.failures.push({name:g.name,device:'desktop-original',error:String(e)})}
   finally{await r.close()}
  }
 }finally{
   await browser.close();
   fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 }
 console.log('UNIFIED_ARCADE '+report.runs.length+'/'+(21+report.original)+' with '+
   report.failures.length+' failures');
 if(report.failures.length){
  console.error(JSON.stringify(report.failures,null,2));
  process.exitCode=1;
 }
})().catch(e=>{
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 console.error(e);process.exitCode=1;
});
