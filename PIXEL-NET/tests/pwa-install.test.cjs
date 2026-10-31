// Test the installable PIXEL-NET arcade from a LOCAL server. No Firebase writes.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const dir='pwa-test-results';fs.mkdirSync(dir,{recursive:true});
const report={tests:[],errors:[],screenshots:[]};
const log=(name,data)=>report.tests.push({name,...data});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const desktop=await browser.newContext({viewport:{width:1365,height:890}});
  await desktop.route(/pixel-net-arcade-default-rtdb\.firebaseio\.com/i,r=>
    r.request().method()==='GET'
      ?r.fulfill({status:200,contentType:'application/json',body:'{}'}) :r.abort());
  const page=await desktop.newPage();
  page.on('pageerror',err=>report.errors.push('desktop: '+err.message));
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('.px-install-btn').count()>=2,'Install button in modal and arcade header');
  await page.fill('#initialsInput','ABC');
  await page.locator('#initialModal .btn-save').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#playerInitials').textContent(),'ABC');
  assert.equal(await page.evaluate(()=>localStorage.getItem('PIXELNET_INITIALS')),'ABC');
  log('Initials saved', {value:'ABC',status:'pass'});
  await page.reload();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#playerInitials').textContent(),'ABC','initials persist after reload');
  assert.ok(await page.locator('#initialModal').evaluate(el=>getComputedStyle(el).display==='none'),
    'No initials modal on repeat visit');
  log('Initials persist', {status:'pass'});

  const manifest=await page.evaluate(async()=>{
    const link=document.querySelector('link[rel="manifest"]');
    const res=await fetch(link.href);
    return {url:link.href,ok:res.ok,data:await res.json()};
  });
  assert.ok(manifest.ok,'manifest HTTP 200');
  assert.equal(manifest.data.display,'standalone');
  assert.equal(manifest.data.start_url,'./index.html');
  assert.equal(manifest.data.icons.length,2);
  for(const icon of manifest.data.icons){
    const res=await page.request.get(new URL(icon.src,manifest.url).href);
    assert.equal(res.status(),200,'app icon available');
    assert.equal(res.headers()['content-type'].split(';')[0],'image/png');
    const buffer=await res.body();
    assert.equal(buffer.subarray(1,4).toString('ascii'),'PNG','valid PNG');
  }
  log('Manifest and two PNG icons', {status:'pass',start_url:manifest.data.start_url});

  // Simulate Chromium's native event to test user-gesture button wiring deterministically.
  await page.evaluate(()=>{
    window.__installPromptCount=0;
    const evt=new Event('beforeinstallprompt',{cancelable:true});
    evt.prompt=()=>{window.__installPromptCount++;return Promise.resolve();};
    evt.userChoice=Promise.resolve({outcome:'accepted'});
    dispatchEvent(evt);
  });
  await page.locator('.px-install-header').first().click();
  assert.equal(await page.evaluate(()=>window.__installPromptCount),1);
  log('Install button triggers native prompt', {status:'pass',triggerCount:1});
  await page.screenshot({path:dir+'/desktop-install.png'});
  report.screenshots.push('desktop-install.png');

  await page.goto('http://127.0.0.1:8765/games/neon-chase-v2/wrapper-v2.html',
    {waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#initials').textContent(),'ABC');
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.px-install-btn').count()>=1,'Game wrapper has install action');
  log('Wrapper keeps initials and install action', {status:'pass'});
  await page.locator('#playerBtn').click();
  await page.locator('#initialsInput').fill('XYZ');
  await page.locator('#saveInitials').click();
  assert.equal(await page.locator('#initials').textContent(),'XYZ','change initials remains enabled');
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#playerInitials').textContent==='XYZ',{timeout:5000});
  assert.equal(await page.locator('#playerInitials').textContent(),'XYZ');
  log('Change initials in app', {status:'pass',value:'XYZ'});

  await page.evaluate(()=>navigator.serviceWorker.ready);
  assert.ok(await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration('/'))),
    'service worker registered');
  log('Service worker installed', {status:'pass'});
  await desktop.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('.logo').isVisible(),'home screen available offline');
  log('Offline hub shell', {status:'pass'});
  // Force a genuinely uncached navigation rather than an old browser HTTP
  // entry. Service workers are allowed to return cached pages previously seen.
  const probeUrl='http://127.0.0.1:8765/games/retro-kombat-v2/wrapper-v2.html?offline-probe=never-seen';
  const uncached=await page.goto(probeUrl,{waitUntil:'domcontentloaded',timeout:12000});
  const offlineBody=await page.locator('body').textContent();
  assert.ok(uncached.status()===503||offlineBody.includes('Game unavailable offline'),
    'Uncached game must show an offline notice instead of the arcade home page');
  assert.ok(offlineBody.includes('Game unavailable offline'));
  log('Offline game shows honest connection requirement', {status:'pass'});
  await desktop.close();

  const iphone=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
  });
  await iphone.route(/pixel-net-arcade-default-rtdb\.firebaseio\.com/i,r=>
    r.request().method()==='GET'?r.fulfill({status:200,contentType:'application/json',body:'{}'}):r.abort());
  const ios=await iphone.newPage();
  ios.on('pageerror',err=>report.errors.push('ios simulation: '+err.message));
  await ios.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await ios.fill('#initialsInput','TJW');
  await ios.locator('#initialModal .btn-save').click();
  await ios.waitForTimeout(320);
  await ios.locator('.px-install-header').click();
  assert.ok(await ios.locator('.px-install-dialog').isVisible(),'iOS help overlay');
  assert.ok((await ios.locator('.px-install-dialog').textContent()).includes('Add to Home Screen'));
  await ios.screenshot({path:dir+'/ios-install-guide.png'});
  report.screenshots.push('ios-install-guide.png');
  log('iPhone fallback instructions', {status:'pass',note:'Browser user-agent emulation, not actual iOS Safari'});
  await iphone.close();

  assert.deepEqual(report.errors,[],'No unhandled JS errors');
  fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));
  console.log('PASS: manifest/icon, install prompt, persisted/editable initials, wrapper, offline shell, iOS guidance');
 }finally{await browser.close()}
})().catch(err=>{
 report.failure=String(err.stack||err);
 fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));
 console.error(err);
 process.exitCode=1;
});
