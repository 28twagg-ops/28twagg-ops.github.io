// PIXEL-NET third-party imports: local-only structural + browser launch audit.
// No Firebase writes and no connection to external production score services.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/';
const ROOT='PIXEL-NET';
const items=JSON.parse(fs.readFileSync(path.join(ROOT,'licensed/catalog.json'),'utf8'));
const RESULTS='licensed-smoke-results';
fs.mkdirSync(RESULTS,{recursive:true});
const expected=['2048','astroblast','missile-defense','pong','snake','brickout','moon-lander','emoji-survivors','pool','flap'];
assert.deepEqual(items.map(x=>x.id),expected,'Ten requested games must be present in order');
assert.equal(new Set(items.map(x=>x.id)).size,10);
for(const g of items){
  const base=path.resolve(ROOT,'licensed');
  const file=path.resolve(base,g.path);
  const license=path.resolve(base,g.notice);
  assert.ok(file.startsWith(base+path.sep),'Imported path escaped licensed folder');
  assert.ok(fs.existsSync(file),'Missing imported game: '+g.id);
  assert.ok(fs.existsSync(license),'Missing original license: '+g.id);
  assert.equal(g.license,'MIT');
}
for(const resource of [
'licensed/vendors/littlejs/templates/engineLoader.js',
'licensed/vendors/littlejs/templates/gameFx.js',
'licensed/vendors/littlejs/templates/menus.js',
'licensed/vendors/littlejs/templates/textureGenerator.js',
'licensed/vendors/littlejs/dist/littlejs.min.js',
'licensed/vendors/littlejs/dist/box2d.wasm.js',
'licensed/vendors/littlejs/dist/box2d.wasm.wasm',
'licensed/vendors/opengames/shared/audio.js',
'licensed/vendors/opengames/shared/ui.js',
'licensed/vendors/opengames/shared/input.js',
'licensed/vendors/opengames/shared/style.css',
'licensed/vendors/2048/style/main.css'
])assert.ok(fs.existsSync(path.join(ROOT,resource)),'Missing shared asset '+resource);
const catalogOut={checked:[],errors:[]};
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const home=await browser.newPage();
    await home.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
    await home.waitForFunction(()=>document.querySelectorAll('.game-card').length===29);
    assert.equal(await home.locator('.licensedTag').count(),10,'Licensed games are missing from the main arcade floor');
    await home.close();
    const gallery=await browser.newPage();
    await gallery.goto(BASE+'licensed/index.html',{waitUntil:'domcontentloaded'});
    await gallery.locator('.tile').first().waitFor();
    assert.equal(await gallery.locator('.tile').count(),10);
    for(const game of items){
      const context=await browser.newContext({viewport:{width:1000,height:800},reducedMotion:'reduce'});
      const page=await context.newPage();
      const failures=[];
      const requests=[];
      page.on('pageerror',e=>failures.push('top page error: '+e.message));
      page.on('response',r=>{
        const u=r.url();
        if(u.startsWith(BASE)&&r.status()>=400&&!u.endsWith('/favicon.ico'))
          failures.push('HTTP '+r.status()+' '+u);
      });
      page.on('request',r=>{
        if(/firebaseio\.com|identitytoolkit\.googleapis\.com/i.test(r.url()))
          requests.push(r.url());
      });
      await page.goto(BASE+'licensed/play.html?game='+encodeURIComponent(game.id),{waitUntil:'domcontentloaded'});
      await page.locator('#game').waitFor();
      const frame=page.frameLocator('#game');
      const iframe=await page.locator('#game').elementHandle();
      const content=await iframe.contentFrame();
      // Top-level Page.pageerror receives exceptions raised by child frames.
      await page.waitForFunction(expectedPath=>{
        const el=document.getElementById('game');
        return el?.contentWindow?.location?.pathname.endsWith(expectedPath);
      },'/'+game.path,{timeout:15000});
      if(game.id==='2048'){
        await frame.locator('.tile').first().waitFor({timeout:18000});
        await frame.locator('body').click({position:{x:5,y:5}});
        await page.keyboard.press('ArrowLeft');
      }else{
        await frame.locator('canvas').first().waitFor({timeout:20000});
      }
      await page.waitForTimeout(game.id==='pool'?1500:450);
      assert.equal(requests.length,0,game.id+' tried to access production score services');
      if(failures.length)throw new Error(game.id+': '+failures.join('; '));
      assert.ok((await page.locator('#author').textContent()).includes(game.creator));
      const notice=await page.locator('#license').getAttribute('href');
      assert.ok(notice.includes('/licensed/vendors/'));
      catalogOut.checked.push({id:game.id,frame:await content.url(),status:'pass'});
      await context.close();
    }
    fs.writeFileSync(RESULTS+'/report.json',JSON.stringify(catalogOut,null,2));
    console.log('LICENSED_GAMES_PASS '+catalogOut.checked.length+'/10');
  }finally{await browser.close();}
})().catch(e=>{
  catalogOut.errors.push(String(e.stack||e));
  fs.writeFileSync(RESULTS+'/report.json',JSON.stringify(catalogOut,null,2));
  console.error(e);
  process.exitCode=1;
});
