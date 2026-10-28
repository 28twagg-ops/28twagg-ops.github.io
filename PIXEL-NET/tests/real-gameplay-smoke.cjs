// Real Chromium gameplay smoke: start Neon Chase, move, lose lives,
// trigger genuine game-over score event, and verify one MOCK submission.
// Never posts test scores to the live Firebase database.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const posts=[];
  await context.route('**/wrapper/shell.js',async route=>{
   const response=await route.fetch();
   const js=(await response.text()).replace('const FIREBASE_WEB_API_KEY = "";',
     'const FIREBASE_WEB_API_KEY = "TEST_KEY";');
   await route.fulfill({response,body:js,contentType:'application/javascript'});
  });
  await context.route(/identitytoolkit.googleapis.com/,route=>
   route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({idToken:'mock-gameplay-token',expiresIn:'3600'})}));
  await context.route(/firebaseio\.com/,route=>{
   if(route.request().method()==='POST'){
    posts.push({url:route.request().url(),data:JSON.parse(route.request().postData())});
    return route.fulfill({status:200,contentType:'application/json',body:'{"name":"mock-gameplay"}'});
   }
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/games/neon-chase-v2/wrapper-v2.html');
  const frame=page.frameLocator('#gameDesktop');
  await frame.locator('button.reboot-btn').click();
  await frame.locator('#gameCanvas').waitFor({state:'visible'});
  const before=await frame.locator('body').evaluate(()=>({
   state:gameState,score,lives,x:player.x,y:player.y
  }));
  assert.equal(before.state,'PLAY');assert.equal(before.lives,3);
  await frame.locator('body').press('ArrowLeft');
  await page.waitForTimeout(850);
  const after=await frame.locator('body').evaluate(()=>({
   state:gameState,score,lives,x:player.x,y:player.y
  }));
  assert.ok(after.x!==before.x||after.y!==before.y,
   'Player must move when arrow key pressed');
  // Drive the real game-over lifecycle, rather than injecting a fake score event.
  await frame.locator('body').evaluate(()=>{killPlayer();killPlayer();killPlayer()});
  await frame.locator('.failure-text').waitFor({state:'visible',timeout:5000});
  await page.waitForTimeout(700);
  const end=await frame.locator('body').evaluate(()=>({state:gameState,score,lives}));
  assert.equal(end.state,'GAMEOVER');assert.equal(end.lives,0);
  assert.equal(posts.length,1,'Game over should produce one mock global score write');
  assert.equal(posts[0].data.score,end.score);
  assert.ok(posts[0].url.includes('auth=mock-gameplay-token'));
  assert.equal(errors.length,0,'Browser errors: '+errors.join('; '));
  await frame.locator('button.reboot-btn').click();
  const restarted=await frame.locator('body').evaluate(()=>({state:gameState,score,lives}));
  assert.deepEqual(restarted,{state:'PLAY',score:0,lives:3});
  console.log('PASS real Neon Chase gameplay: start, movement, game over, one authenticated MOCK submission, restart');
  console.log(JSON.stringify({before,after,end,posts:posts.length,restarted}));
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
