// Independent PIXEL-NET QA: scripted emulator sessions, not physical-device certification.
'use strict';
const fs=require('fs'),{chromium,webkit,devices}=require('playwright');
const names=['desktop','iphonePortrait','iphoneLandscape','androidPortrait','androidLandscape'];
const chosen=process.env.PROFILE||'desktop';
if(!names.includes(chosen))throw Error('Bad profile '+chosen);
const mobile=chosen!=='desktop',ios=chosen.startsWith('iphone');
const device=chosen==='desktop'?{viewport:{width:1440,height:900}}:{...(ios?devices['iPhone 13']:devices['Pixel 7']),viewport:
 chosen.endsWith('Landscape')?{width:ios?844:915,height:ios?390:412}:{width:ios?390:412,height:ios?844:915}};
const engine=ios?webkit:chromium,base='http://127.0.0.1:8765/';
const catalog=JSON.parse(fs.readFileSync('PIXEL-NET/games.json'));
const dir='independent-qa-evidence/'+chosen;fs.mkdirSync(dir,{recursive:true});
const emulator=new Set(['dig-dug-delve','combat-cx2601','jungle-jr-rescue','track-field-blitz','orbit-siege']);
const report={profile:chosen,deviceType:'browser-emulated',items:[],limitations:[
 'No real-device testing','No production Firebase writes','Input attempts alone do not prove a full round is playable']};
const delay=t=>new Promise(r=>setTimeout(r,t));
async function measure(frame){
 return frame.evaluate(()=>{
  const c=[...document.querySelectorAll('canvas')].find(e=>e.width>5&&e.height>5);
  let checksum=null;
  if(c){try{const x=c.getContext('2d');if(x){const a=x.getImageData(0,0,Math.min(c.width,64),Math.min(c.height,64)).data;
   let n=0;for(let i=0;i<a.length;i+=32)n=(Math.imul(n,31)+a[i]+a[i+1]*256+a[i+2]*65536)>>>0;checksum=n;
  }}catch(e){}}
  return {text:(document.body?.innerText||'').replace(/\s+/g,' ').slice(0,180),
   checksum,canvases:document.querySelectorAll('canvas').length,
   scoreLabels:[...document.querySelectorAll('[id*=score],[class*=score],[id*=level],[id*=wave]')]
      .filter(x=>x.getBoundingClientRect().width>0).slice(0,10).map(x=>(x.textContent||'').trim().slice(0,60)),
   scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
 });
}
async function clickFirst(loc,steps,label){
 try{if(await loc.count()&&await loc.first().isVisible()){
  await loc.first().click({timeout:1800});steps.push(label);return true;
 }}catch(e){}return false;
}
async function runInput(page,frame,slug,steps){
 if(emulator.has(slug)){
  await clickFirst(frame.locator('#actions button, button:has-text("START")'),steps,'emulator start button');
  return;
 }
 if(slug==='licensed-2048'){
  const board=frame.locator('.game-container');
  if(await board.count()){
   await board.evaluate(el=>{
    const r=el.getBoundingClientRect(),p=(x,y)=>({identifier:0,target:el,clientX:x,clientY:y,pageX:x,pageY:y});
    const a=p(r.right-20,r.top+r.height/2),b=p(r.left+20,r.top+r.height/2);
    for(const [type,touches,changed] of [['touchstart',[a],[a]],['touchend',[],[b]]]){
     const ev=new Event(type,{bubbles:true,cancelable:true});
     for(const [key,value] of Object.entries({touches,targetTouches:touches,changedTouches:changed}))
      Object.defineProperty(ev,key,{value});
     el.dispatchEvent(ev);
    }
   });
   steps.push('synthetic 2048 touch swipe');
  }
  return;
 }
 if(slug.startsWith('licensed-')){
  await clickFirst(frame.locator('#overlay-action, button.ljs-menu-item:has-text("PLAY")'),steps,'start licensed game');
  await clickFirst(frame.locator('button.ljs-menu-item[data-item-id^="hero-"]:not([disabled])'),steps,'choose character');
  await clickFirst(frame.locator('button.ljs-menu-item[data-item-id^="stage-"]:not([disabled])'),steps,'choose stage');
  return;
 }
 await clickFirst(frame.locator('#start-btn,#btnStart,#startBtn,#startButton,#btn,#overlay button,button:has-text("START"),button:has-text("PLAY")'),steps,'start original game');
 if(slug==='spyder-casino'){
  if(!mobile)await frame.locator('body').press('1').then(()=>steps.push('select blackjack')).catch(()=>{});
 }else{
  await page.locator(mobile?'#gameMobile':'#gameDesktop').focus().catch(()=>{});
  for(const key of ['ArrowUp','ArrowRight','Space']){
   await page.keyboard.press(key).then(()=>steps.push(key)).catch(()=>{});
  }
 }
 if(mobile){
  let rect=await page.locator('#gameMobile').boundingBox().catch(()=>null);
  if(rect){
   let x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   await page.touchscreen.tap(x,y).then(()=>steps.push('tap')).catch(()=>{});
  }
 }
}
(async()=>{
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 try{
  for(const game of catalog){
   const context=await browser.newContext({...device,serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage();
   const status={slug:game.slug,licensed:!!game.licensed,attempted:[],js:[],localHttp:[],externalErrors:[]};
   await context.route(/firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/,route=>
    route.request().method()==='GET'?route.fulfill({status:200,contentType:'application/json',body:'null'}):
     route.fulfill({status:403,contentType:'application/json',body:'{"error":"QA: writes blocked"}'}));
   page.on('pageerror',e=>status.js.push(e.message.slice(0,200)));
   page.on('response',resp=>{if(resp.status()>=400&&!resp.url().endsWith('/favicon.ico'))
    (resp.url().startsWith(base)?status.localHttp:status.externalErrors).push(resp.status()+' '+resp.url().slice(0,150));
   });
   try{
    const response=await page.goto(base+game.path,{waitUntil:'domcontentloaded',timeout:22000});
    if(response.status()!==200)throw Error('Wrapper HTTP '+response.status());
    if(mobile && ['astrotype','licensed-astroblast','licensed-missile-defense'].includes(game.slug))
      await page.locator('.pn-mobile-gate button').click({timeout:5000});
    const id=mobile?'#gameMobile':'#gameDesktop';
    await page.waitForFunction(s=>{let e=document.querySelector(s);return !!e?.contentWindow && e.contentWindow.location.href!=='about:blank'},id,{timeout:16000});
    const h=await page.locator(id).elementHandle(),frame=await h.contentFrame();
    await delay(emulator.has(game.slug)?5500:800);
    status.before=await measure(frame);
    if(ios&&chosen==='iphonePortrait')await page.screenshot({path:dir+'/'+game.slug+'-menu.png',timeout:5000}).catch(()=>{});
    await runInput(page,frame,game.slug,status.attempted);
    await delay(950);
    status.after=await measure(frame);
    status.canvasChanged=status.before.checksum!==null&&status.after.checksum!==null&&status.before.checksum!==status.after.checksum;
    status.labelsChanged=JSON.stringify(status.before.scoreLabels)!==JSON.stringify(status.after.scoreLabels);
    status.layout=await page.evaluate(id=>{
     const r=s=>{let e=document.querySelector(s);if(!e)return null;let a=e.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,right:a.right,bottom:a.bottom}};
     return {w:innerWidth,h:innerHeight,docW:document.documentElement.scrollWidth,game:r(id),title:r('.gameBadge'),exit:r('.exit'),player:r('.playerBtn'),tabs:r('.btnbar')};
    },id);
    if(ios&&chosen==='iphoneLandscape')await page.screenshot({path:dir+'/'+game.slug+'-landscape.png',timeout:5000}).catch(()=>{});
   }catch(e){
    status.fatal=String(e.message||e).slice(0,500);
    await page.screenshot({path:dir+'/'+game.slug+'-error.png',timeout:5000}).catch(()=>{});
   }finally{
    report.items.push(status);
    fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));
    console.log('INDEPENDENT '+JSON.stringify({name:status.slug,device:chosen,fatal:status.fatal||null,
      inputs:status.attempted.length,canvasChanged:status.canvasChanged,labelsChanged:status.labelsChanged,
      js:status.js.length,localHttp:status.localHttp.length,external:status.externalErrors.length}));
    await context.close();
   }
  }
 }finally{await browser.close();}
 console.log('INDEPENDENT_SUMMARY '+JSON.stringify({profile:chosen,visited:report.items.length,
  fatal:report.items.filter(x=>x.fatal).map(x=>x.slug),changed:report.items.filter(x=>x.canvasChanged||x.labelsChanged).length,
  caveat:'Visual change alone does not prove playable game objectives; real-device and full-round tests remain open'}));
 if(report.items.some(x=>x.fatal))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
