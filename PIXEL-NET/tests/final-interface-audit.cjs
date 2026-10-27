// PIXEL-NET full 19-wrapper visual and functionality smoke audit.
// Offline local website, no production score writes. Covers actual browser layout.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const output='final-interface-audit';
fs.mkdirSync(output,{recursive:true});
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const emulator=new Set(['dig-dug-delve','combat-cx2601','jungle-jr-rescue','track-field-blitz','orbit-siege']);
const placeholder=new Set(['retro-kombat']);
const views=[
  {device:'desktop',viewport:{width:1440,height:900},id:'#gameDesktop'},
  {device:'mobile',viewport:{width:390,height:844},id:'#gameMobile'},
  {device:'small-mobile',viewport:{width:360,height:700},id:'#gameMobile'}
];
const result={generated:new Date().toISOString(),games:catalog.length,cases:[],
 liveOriginal:{},notes:['This is a UI smoke test, not full gameplay certification.',
   'Live Firebase read/write rules require separate authorized repair.']};
const check=(condition,msg)=>{if(!condition)throw Error(msg)};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  // First verify production website from actual Chromium, never write a score.
  const live=await browser.newContext({viewport:{width:1280,height:800}});
  const lp=await live.newPage();
  await lp.route(/firebaseio\.com/i,route=>route.request().method()==='GET'
    ?route.continue():route.abort());
  try{
    const response=await lp.goto('https://28twagg-ops.github.io/PIXEL-NET/',
      {waitUntil:'domcontentloaded',timeout:18000});
    result.liveOriginal={http:response?.status(),title:await lp.title(),
      catalogVisible:await lp.locator('#gamesGrid').count()};
    await lp.screenshot({path:output+'/live-original-home.png',timeout:12000});
  }catch(e){result.liveOriginal={blocked:String(e.message||e).slice(0,260)}}
  await live.close();

  for(const view of views){
   const context=await browser.newContext({
     viewport:view.viewport,hasTouch:view.device!=='desktop',deviceScaleFactor:1
   });
   await context.route(/pixel-net-arcade-default-rtdb\.firebaseio\.com/i,route=>
     route.request().method()==='GET'
       ?route.fulfill({status:200,contentType:'application/json',
         body:JSON.stringify({'test-only':{initials:'QA1',score:420,t:1,mode:'STANDARD'}})})
       :route.abort());
   for(const game of catalog){
    const page=await context.newPage();
    const issues=[],pageErrors=[],failedResources=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    page.on('response',response=>{
      if(response.status()>=400&&response.url().startsWith('http://127.0.0.1'))
        failedResources.push(response.status()+' '+response.url());
    });
    const item={device:view.device,slug:game.slug,entry:game.path,
      category:emulator.has(game.slug)?'emulator':placeholder.has(game.slug)?'placeholder':'custom',
      issues,pageErrors,failedResources};
    try{
      const response=await page.goto('http://127.0.0.1:8765/'+game.path,
        {waitUntil:'domcontentloaded',timeout:20000});
      check(response?.status()===200,'Wrapper did not return HTTP 200');
      await page.locator(view.id).waitFor({state:'visible',timeout:9000});
      await page.waitForTimeout(230);
      const measurements=await page.evaluate(frameSelector=>{
        const e=document.documentElement,style=getComputedStyle(e);
        const frame=document.querySelector(frameSelector);
        const rect=frame.getBoundingClientRect();
        const container=(frameSelector==='#gameDesktop'
          ?document.querySelector('.center'):document.querySelector('.displayZone'));
        const bounds=container.getBoundingClientRect();
        const howto=document.querySelector(frameSelector==='#gameDesktop'
          ?'.shell>.panel':'#view-howto');
        const scores=document.querySelector(frameSelector==='#gameDesktop'
          ?'.shell>.panel.leaderboard':'#view-board');
        const getStyle=el=>el?getComputedStyle(el):null;
        const firstCard=howto?.querySelector('.instrCard');
        return {
          hero:style.getPropertyValue('--hero').trim(),
          secondary:style.getPropertyValue('--hero2').trim(),
          gameTheme:e.dataset.game,
          panelBorder:getStyle(howto)?.borderColor,
          scoreBorder:getStyle(scores)?.borderColor,
          cardBorder:getStyle(firstCard)?.borderColor,
          wrapper:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
          zone:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},
          tabs:[...document.querySelectorAll('.tabBtn')].map(b=>({
            label:b.textContent.trim(),w:b.getBoundingClientRect().width
          })),
          statuses:[...document.querySelectorAll('[data-lb-status]')].map(n=>n.textContent),
          notice:document.querySelector('#boardNoticeDesktop')?.textContent,
          desktopSrc:document.querySelector('#gameDesktop').getAttribute('src'),
          mobileSrc:document.querySelector('#gameMobile').getAttribute('src'),
          viewportWidth:innerWidth,
          pageScrollWidth:document.documentElement.scrollWidth
        }
      },view.id);
      item.layout=measurements;
      check(measurements.hero&&measurements.secondary,'Missing cabinet theme');
      check(measurements.gameTheme===game.slug,'Incorrect game theme identifier');
      check(measurements.wrapper.width>40&&measurements.wrapper.height>40,'Game area zero size');
      check(measurements.wrapper.width<=measurements.zone.width+3,'Frame exceeds container width');
      check(measurements.wrapper.height<=measurements.zone.height+3,'Frame exceeds container height');
      check(measurements.pageScrollWidth<=view.viewport.width+3,'Horizontal page overflow');
      check(measurements.statuses.includes('GLOBAL LIVE'),'Mocked global leaderboard failed');
      const invisible=view.device==='desktop'?'mobileSrc':'desktopSrc';
      check(!measurements[invisible],'Duplicated hidden game instance');

      // Desktop and mobile panels must work as navigable content.
      if(view.device!=='desktop'){
        await page.locator('.tabBtn[data-tab="howto"]').click();
        check(await page.locator('#view-howto').isVisible(),'How To tab inaccessible');
        const text=await page.locator('#instructionsMobile').innerText();
        check(text.trim().length>8,'Empty instructions');
        await page.locator('.tabBtn[data-tab="board"]').click();
        check(await page.locator('#view-board').isVisible(),'Leaderboard tab inaccessible');
        if(item.category==='custom')check((await page.locator('#view-board').innerText()).includes('QA1') ||
           game.slug==='spyder-casino','Global test data not shown');
        await page.locator('.tabBtn[data-tab="game"]').click();
        check(await page.locator('#view-game').isVisible(),'Game tab inaccessible');
      }
      const frame=page.frameLocator(view.id);
      try{
        const canvasInfo=await frame.locator('body').evaluate(()=>{
          const elements=[...document.querySelectorAll('canvas')]
            .filter(c=>c.width>0&&c.height>0);
          if(!elements.length)return null;
          const list=elements.map(c=>{
            const r=c.getBoundingClientRect();
            return {native:[c.width,c.height],screen:[r.width,r.height],
             area:r.width*r.height,
             distortion:(r.width/r.height)/(c.width/c.height)};
          }).sort((a,b)=>b.area-a.area);
          return list[0];
        },{timeout:5500});
        item.canvas=canvasInfo;
        if(item.category==='custom'&&canvasInfo)
          check(Math.abs(canvasInfo.distortion-1)<.035,'Native canvas distorted');
      }catch(e){if(item.category==='custom')issues.push('Canvas check: '+String(e.message).slice(0,100))}
      if(view.device!=='small-mobile'){
        await page.screenshot({path:output+'/'+game.slug+'-'+view.device+'.png',timeout:12000});
      }
      if(item.category==='custom'&&failedResources.length)issues.push('Broken local resources: '+failedResources.length);
      if(item.category==='custom'&&pageErrors.length)issues.push('Page script errors: '+pageErrors.length);
      item.pass=issues.length===0;
    }catch(e){item.pass=false;issues.push(String(e.message||e).slice(0,550))}
    result.cases.push(item);
    await page.close();
   }
   await context.close();
  }
  const custom=result.cases.filter(x=>x.category==='custom');
  result.summary={
    totalCases:result.cases.length,
    customCases:custom.length,
    passedCustom:custom.filter(x=>x.pass).length,
    failed:result.cases.filter(x=>!x.pass).map(x=>({
      slug:x.slug,device:x.device,issues:x.issues
    })),
    emulatorCases:result.cases.filter(x=>x.category==='emulator').length,
    placeholderCases:result.cases.filter(x=>x.category==='placeholder').length
  };
  fs.writeFileSync(output+'/audit.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result.summary,null,2));
  // Fail CI for custom game regressions, not emulator/placeholder incompatibility.
  assert.equal(custom.filter(x=>!x.pass).length,0,'Custom game wrapper failures');
 }finally{await browser.close()}
})().catch(e=>{
 result.failure=String(e.stack||e);
 fs.writeFileSync(output+'/audit.json',JSON.stringify(result,null,2));
 console.error(e);process.exitCode=1;
});
