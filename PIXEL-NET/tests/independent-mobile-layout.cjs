// PIXEL-NET 28-game portrait/landscape mobile wrapper and playability check.
// Verifies layout, real active iframe, header overlap, casino touch commands,
// safe optional desktop game gates and focus/maximize behavior.
// No public score writes.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {webkit,devices}=require('playwright');
const games=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const OUT='mobile-layout-results';
fs.mkdirSync(OUT,{recursive:true});
const issues=[],checks=[];
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  for(const game of games){
   for(const mode of ['portrait','landscape']){
    const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
    await context.route(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/,route=>{
      if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'null'});
      return route.fulfill({status:403,contentType:'application/json',body:'{"error":"Blocked QA write"}'});
    });
    const page=await context.newPage();
    try{
      if(mode==='landscape')await page.setViewportSize({width:844,height:390});
      await page.goto('http://127.0.0.1:8765/'+game.path,{waitUntil:'domcontentloaded',timeout:25000});
      if(['astrotype','licensed-astroblast','licensed-missile-defense'].includes(game.slug))
        await page.locator('.pn-mobile-gate button').click({timeout:5000});
      await page.waitForFunction(()=>{let f=document.querySelector('#gameMobile');return !!f?.getAttribute('src')&&f.contentWindow?.location.href!=='about:blank'},null,{timeout:14000});
      const dims=await page.evaluate(()=>{
       const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
       const hdr=rect(document.querySelector('.topbar'));
       const badge=rect(document.querySelector('.gameBadge'));
       const left=rect(document.querySelector('.top-left'));
       const right=rect(document.querySelector('.playerBtn'));
       const game=rect(document.querySelector('#view-game'));
       const nav=rect(document.querySelector('.btnbar'));
       return {hdr,badge,left,right,game,nav,viewW:innerWidth,viewH:innerHeight,
         documentOverflow:document.documentElement.scrollWidth-innerWidth,
         desktopLoaded:!!document.querySelector('#gameDesktop').getAttribute('src'),
         mobileLoaded:!!document.querySelector('#gameMobile').getAttribute('src')};
      });
      assert.equal(dims.desktopLoaded,false,'A hidden second desktop game was loaded');
      assert.equal(dims.mobileLoaded,true,'Mobile game not loaded');
      assert.ok(dims.documentOverflow<=5,'Horizontal overflow '+dims.documentOverflow);
      assert.ok(dims.badge.x>=dims.left.right-4,'Title overlaps EXIT');
      assert.ok(dims.badge.right<=dims.right.x+4,'Title overlaps player badge');
      assert.ok(dims.game.h>60&&dims.game.w>100,'Game viewport collapsed');
      assert.ok(dims.nav.bottom<=dims.viewH+4,'Mobile tabs below visible viewport');
      if(game.slug==='creek-crosser'){
        const frame=page.frameLocator('#gameMobile');
        const dpad=frame.locator('#mobile-controls');
        assert.equal(await dpad.isVisible(),false,'Old Creek D-pad still covers Start');
      }
      if(game.slug==='spyder-casino'){
        const frame=page.frameLocator('#gameMobile');
        await frame.locator('#pnCasinoTouch button').first().waitFor({state:'visible'});
        const inputFocused=await frame.locator('body').evaluate(()=>document.activeElement?.tagName==='INPUT');
        assert.equal(inputFocused,false,'iPhone auto-opened casino keyboard');
        await frame.locator('#pnCasinoTouch button:has-text("BJ STANDARD")').click();
        await frame.getByRole('button',{name:'+$5',exact:true}).click();
        await frame.locator('#pnCasinoTouch button:has-text("DEAL")').click();
      }
      await page.locator('#maximizeGame').click();
      assert.ok(await page.locator('html.pn-maximized').count(),'Maximize did not enter game focus');
      await page.locator('#restoreGame').click();
      assert.equal(await page.locator('html.pn-focus-play').count(),0,'Restore stuck');
      checks.push({game:game.slug,mode,dims});
      if(['licensed-2048','creek-crosser','spyder-casino','caked-up-cats','astrotype'].includes(game.slug))
        await page.screenshot({path:OUT+'/'+mode+'-'+game.slug+'.png'});
    }catch(e){issues.push({game:game.slug,mode,error:String(e.message||e)});
      try{await page.screenshot({path:OUT+'/FAILED-'+mode+'-'+game.slug+'.png',timeout:3000})}catch(_){}}
    finally{await context.close();fs.writeFileSync(OUT+'/report.json',JSON.stringify({checks:checks.length,expected:games.length*2,issues},null,2))}
   }
  }
 }finally{await browser.close()}
 console.log('MOBILE_LAYOUT '+checks.length+'/'+(games.length*2)+' failed='+issues.length);
 if(issues.length){console.error(JSON.stringify(issues,null,2));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});