// Human review aid: load every current arcade title in a real Chromium browser,
// observe game frame state, missing assets, runtime errors, and gameplay canvas.
// This is diagnostic: no source is removed automatically on weak evidence.
'use strict';
const fs=require('node:fs');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/';
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json','utf8'));
const emulators=new Set(['dig-dug-delve','combat-cx2601','jungle-jr-rescue','track-field-blitz','orbit-siege']);
const out='game-health-evidence';fs.mkdirSync(out,{recursive:true});
const summary={date:new Date().toISOString(),games:[],total:catalog.length};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const g of catalog){
   const context=await browser.newContext({viewport:{width:1366,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[],failedHttp=[],externalFailed=[],unusual=[];
   page.on('pageerror',e=>errors.push(String(e.message).slice(0,350)));
   page.on('requestfailed',r=>{
     if(r.url().startsWith(base))failedHttp.push('NETWORK '+r.url()+' '+r.failure()?.errorText);
     else externalFailed.push('NETWORK '+r.url()+' '+r.failure()?.errorText);
   });
   page.on('response',r=>{
     if(r.status()>=400 && !r.url().split('?')[0].endsWith('/favicon.ico')){
       (r.url().startsWith(base)?failedHttp:externalFailed).push(r.status()+' '+r.url());
     }
   });
   const status={slug:g.slug,name:g.name,licensed:!!g.licensed,entry:g.path};
   try{
    const response=await page.goto(base+g.path,{waitUntil:'domcontentloaded',timeout:20000});
    status.http=response.status();
    const target=await page.locator('#gameDesktop').elementHandle();
    if(!target)throw Error('No game iframe');
    await page.waitForFunction(()=>{
      const f=document.querySelector('#gameDesktop');
      return f?.contentWindow?.location?.href && f.contentWindow.location.href!=='about:blank';
    },null,{timeout:15000});
    const game=await target.contentFrame();
    status.gameUrl=game.url();
    await page.waitForTimeout(emulators.has(g.slug)?16000:2000);
    status.gameUrl=game.url();
    const evidence=await game.evaluate(()=>{
      const main=document.body;
      const canvases=[...document.querySelectorAll('canvas')].map(c=>({
        width:c.width,height:c.height,rectWidth:Math.round(c.getBoundingClientRect().width),
        rectHeight:Math.round(c.getBoundingClientRect().height)})).slice(0,8);
      const videos=[...document.querySelectorAll('video')].map(c=>({width:c.videoWidth,height:c.videoHeight})).slice(0,4);
      const iframe=[...document.querySelectorAll('iframe')].map(i=>({src:i.src.slice(0,150),w:i.clientWidth,h:i.clientHeight})).slice(0,3);
      const ov=document.getElementById('errorOv');
      const overlay=ov?{hidden:ov.classList.contains('hidden'),text:ov.innerText.slice(0,200)}:null;
      const text=(main?.innerText||'').replace(/\s+/g,' ').trim();
      return {bodyText:text.slice(0,400),canvases,videos,iframe,overlay,buttons:document.querySelectorAll('button').length,
        title:document.title,documentSize:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        bodyBackground:getComputedStyle(main).backgroundColor,
        hasMenu:!!document.querySelector('.ljs-menu-item'),
        hasScoreDisplay:!!document.querySelector('#score'),
        documentVisibility:document.visibilityState};
    });
    Object.assign(status,evidence);
    if(emulators.has(g.slug)){
      status.emulator=await game.evaluate(()=>({
        hasLoader:typeof EJS_player!=='undefined',
        emulatorLoaded:typeof EJS_emulator!=='undefined'&&!!EJS_emulator,
        running:typeof EJS_emulator!=='undefined'&&!!EJS_emulator?.started,
        errorOverlay:!document.getElementById('errorOv')?.classList.contains('hidden'),
        errorText:document.getElementById('errorOv')?.innerText.slice(0,260)||null
      })).catch(e=>({evalError:String(e)}));
    }
    if(!g.licensed && g.slug!=='retro-kombat' && !emulators.has(g.slug)){
      await game.locator('body').first().press('Enter',{timeout:1600}).catch(()=>{});
      await game.locator('body').first().press('Space',{timeout:1600}).catch(()=>{});
      await page.waitForTimeout(350);
    }
    status.blankCandidate=!status.canvases?.some(c=>c.rectWidth>50&&c.rectHeight>50)&&
      !status.videos?.some(v=>v.width>50)&& !status.iframe?.some(i=>i.w>50)&&
      status.bodyText?.length<100;
    status.placeholder=/COMING SOON|is being built|entry is a placeholder/i.test(status.bodyText||'');
    status.emulatorError=!!status.overlay&&!status.overlay.hidden;
    status.errors=errors.slice(0,8);
    status.httpFailures=failedHttp.slice(0,10);
    status.externalFailures=externalFailed.slice(0,10);
    status.flag=status.placeholder||status.emulatorError||status.httpFailures.length>0||
      status.errors.length>0||status.blankCandidate;
    if(status.flag||emulators.has(g.slug))
      await page.screenshot({path:out+'/'+g.slug+'.png',fullPage:true,timeout:7000}).catch(()=>{});
   }catch(e){
    status.flag=true;status.fatal=String(e.message||e).slice(0,600);
    status.errors=errors.slice(0,8);
    status.httpFailures=failedHttp.slice(0,10);
    status.externalFailures=externalFailed.slice(0,10);
    await page.screenshot({path:out+'/'+g.slug+'.png',fullPage:true,timeout:7000}).catch(()=>{});
   }finally{
    summary.games.push(status);
    console.log('HEALTH '+g.slug+' '+JSON.stringify({
      flag:status.flag,placeholder:status.placeholder,emulatorError:status.emulatorError,
      fatal:status.fatal,errors:status.errors?.length,localHTTP:status.httpFailures?.length,
      externalHTTP:status.externalFailures?.length,canvases:status.canvases?.length,
      blank:status.blankCandidate,emu:status.emulator
    }));
    fs.writeFileSync(out+'/report.json',JSON.stringify(summary,null,2));
    await context.close();
   }
  }
 }finally{await browser.close();}
 console.log('HEALTH_SUMMARY '+summary.games.length+' games / '+summary.games.filter(x=>x.flag).length+' flagged');
})().catch(e=>{console.error(e);process.exitCode=1;fs.writeFileSync(out+'/report.json',JSON.stringify(summary,null,2))});
