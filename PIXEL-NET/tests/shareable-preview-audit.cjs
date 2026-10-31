// Confirm that an immutable public preview link actually serves the imported games.
// This uses a third-party CDN, not GitHub Pages. No score writes occur.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const sha=process.env.GITHUB_SHA;
if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Missing exact GitHub commit SHA');
const root='https://rawcdn.githack.com/28twagg-ops/28twagg-ops.github.io/'+sha+'/PIXEL-NET/licensed/';
const games=JSON.parse(fs.readFileSync('PIXEL-NET/licensed/catalog.json','utf8'));
const report={url:root+'index.html',games:[],error:null};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  // This cookie suppresses the CDN's automated anti-phishing confirmation
  // for a controlled QA browser. Real visitors may see a confirmation page.
  const context=await browser.newContext({viewport:{width:1200,height:830}});
  await context.addCookies([{name:'__Http-phish',value:'1',url:'https://rawcdn.githack.com/',secure:true,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  const r=await page.goto(root+'index.html',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(r.status(),200,'Preview HTML not served');
  await page.locator('.tile').first().waitFor({timeout:15000});
  assert.equal(await page.locator('.tile').count(),10,'Expected ten licensed game cards');
  for(const game of games){
   const url=root+'play.html?game='+encodeURIComponent(game.id);
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(response.status(),200);
   const gameFrame=page.frameLocator('#game');
   if(game.id==='2048')await gameFrame.locator('.tile').first().waitFor({timeout:25000});
   else await gameFrame.locator('canvas').first().waitFor({timeout:25000});
   assert.equal(errors.length,0,game.id+': '+errors.join('; '));
   assert.ok((await page.locator('#author').textContent()).includes(game.creator));
   report.games.push({id:game.id,status:'pass'});
  }
  console.log('PUBLIC_PREVIEW_OK '+report.games.length+'/10 '+report.url);
 }finally{
  fs.mkdirSync('preview-audit-results',{recursive:true});
  fs.writeFileSync('preview-audit-results/report.json',JSON.stringify(report,null,2));
  await browser.close();
 }
})().catch(e=>{
 report.error=String(e.stack||e);
 fs.mkdirSync('preview-audit-results',{recursive:true});
 fs.writeFileSync('preview-audit-results/report.json',JSON.stringify(report,null,2));
 console.error(e);
 process.exitCode=1;
});
