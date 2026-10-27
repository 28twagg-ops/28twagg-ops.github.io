// Playwright smoke test against a LOCAL copy of PIXEL-NET.
// Run: python3 -m http.server 8765 --directory PIXEL-NET
//      node PIXEL-NET/tests/neon-chase-browser.cjs
// No production endpoints, leaderboards, ROMs or external game assets.
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'playwright-artifacts';
fs.mkdirSync(out,{recursive:true});
const url = 'http://127.0.0.1:8765/games/neon-chase-v2/game.html';
const stats={url,desktop:{},mobile:{},consoleErrors:[],pageErrors:[]};
const main=async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const desktop=await browser.newContext({viewport:{width:1000,height:780}});
    const page=await desktop.newPage();
    page.on('console',msg=>{if(msg.type()==='error')stats.consoleErrors.push(msg.text());});
    page.on('pageerror',err=>stats.pageErrors.push(err.message));
    await page.addInitScript(()=>{
      window.__scoreEvents=[];
      window.addEventListener('message',e=>{
        if(e.data?.type==='GAME_OVER_SCORE')window.__scoreEvents.push(e.data);
      });
    });
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'INITIATE'}).click();
    const before=await page.evaluate(()=>({state:gameState,x:player.x,score,lives}));
    assert.equal(before.state,'PLAY');
    await page.keyboard.press('d');
    await page.waitForTimeout(320);
    const after=await page.evaluate(()=>({x:player.x,score,lives}));
    assert.ok(after.x>before.x,'D key moves player right from its spawn');
    stats.desktop.movement={before,after};
    await page.keyboard.press('p');
    assert.equal(await page.evaluate(()=>gameState),'PAUSED');
    await page.keyboard.press('p');
    assert.equal(await page.evaluate(()=>gameState),'PLAY');
    stats.desktop.pauseResume=true;
    await page.screenshot({path:out+'/neon-desktop.png'});
    stats.desktop.zones=await page.evaluate(()=>{
      const result=[];
      for(let i=1;i<=3;i++){
        level=i;resetLevel();
        const entities=[player,...drones];
        result.push({zone:i,spawnWalkable:entities.every(e=>{
          const p=e.getGridPos();return currentMapData[p.r]?.[p.c]!==1;
        })});
      }
      return result;
    });
    assert.ok(stats.desktop.zones.every(z=>z.spawnWalkable),'all zones have valid spawns');
    await page.evaluate(()=>{score=123;gameOver();gameOver();});
    await page.waitForTimeout(60);
    stats.desktop.scoreEvents=await page.evaluate(()=>window.__scoreEvents);
    assert.equal(stats.desktop.scoreEvents.length,1,'one event for one finished game');
    assert.equal(stats.desktop.scoreEvents[0].score,123);
    await page.getByRole('button',{name:'REBOOT'}).click();
    assert.ok(await page.evaluate(()=>score===0&&level===1&&lives===3),'restart resets state');
    stats.desktop.restart=true;
    await desktop.close();
    
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const phone=await mobile.newPage();
    phone.on('pageerror',err=>stats.pageErrors.push('mobile: '+err.message));
    await phone.goto(url,{waitUntil:'domcontentloaded'});
    await phone.getByRole('button',{name:'INITIATE'}).click();
    const box=await phone.locator('#gameCanvas').boundingBox();
    assert.ok(box&&box.width>100,'mobile canvas visible');
    const center={x:box.x+box.width/2,y:box.y+box.height/2};
    const cdp=await mobile.newCDPSession(phone);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:center.x+80,y:center.y}]});
    stats.mobile.swipeDirection=await phone.evaluate(()=>({x:nextDir.x,y:nextDir.y}));
    assert.equal(stats.mobile.swipeDirection.x,1,'touch swipe requests right turn');
    await phone.screenshot({path:out+'/neon-mobile.png'});
    stats.mobile.canvas=box;
    await mobile.close();
    
    assert.equal(stats.pageErrors.length,0,'no uncaught page errors');
    fs.writeFileSync(out+'/results.json',JSON.stringify(stats,null,2));
    console.log('PASS: actual Chromium desktop WASD, pause, 3 zone spawns, score message, restart, mobile touch swipe');
  }finally{await browser.close();}
};
main().catch(err=>{
  stats.failure=String(err.stack||err);
  fs.writeFileSync(out+'/results.json',JSON.stringify(stats,null,2));
  console.error(err);
  process.exitCode=1;
});
