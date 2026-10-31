// Firebase Realtime Database security rules tested against the REAL emulator.
// Entirely local. No Firebase production writes or credentials.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {ref,get,set,remove,query,orderByChild,limitToLast}=require('firebase/database');
async function main(){
 const env=await initializeTestEnvironment({
  projectId:'demo-pixelnet',
  database:{host:'127.0.0.1',port:9000,
   rules:fs.readFileSync('PIXEL-NET/firebase/leaderboard-rules-candidate.json','utf8')}
 });
 let n=0;
 const ok=async(desc,p)=>{await assertSucceeds(p);console.log('PASS '+desc);n++};
 const denied=async(desc,p)=>{await assertFails(p);console.log('PASS DENIED '+desc);n++};
 try{
  const publicDb=env.unauthenticatedContext().database();
  const player=env.authenticatedContext('anonymous-player').database();
  const opponent=env.authenticatedContext('different-player').database();
  const path='lb/neon-chase/pn-demo012345abc';
  const entry={initials:'TST',score:123,t:Date.now()};
  await ok('Public reads of leaderboard',get(ref(publicDb,'lb/neon-chase')));
  await denied('Private root reads',get(ref(publicDb)));
  await denied('Unauthenticated score upload',set(ref(publicDb,path),entry));
  await ok('Authenticated score created',set(ref(player,path),entry));
  const snapshot=await get(ref(publicDb,path));
  assert.equal(snapshot.val().initials,'TST');
  assert.equal(snapshot.val().score,123);n++;
  console.log('PASS Public cross-player reads saved score');
  await ok('Second score added to indexed leaderboard',
    set(ref(player,'lb/neon-chase/pn-demo098765xyz'),{...entry,score:70}));
  const top=await get(query(ref(publicDb,'lb/neon-chase'),
    orderByChild('score'),limitToLast(1)));
  assert.equal(Object.values(top.val()).length,1);
  assert.equal(Object.values(top.val())[0].score,123);
  console.log('PASS Indexed top-score query returns highest earned score');n++;
  await denied('Same player cannot modify score',set(ref(player,path),{...entry,score:9000}));
  await denied('Other player cannot modify score',set(ref(opponent,path),{...entry,score:9000}));
  await denied('No one can delete the score',remove(ref(player,path)));
  await denied('Cannot write unknown game',set(ref(player,'lb/not-a-game/pn-demo012345abc'),entry));
  await denied('Cannot write invalid initials',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),{...entry,initials:'BAD!'}));
  await denied('Cannot write impossible score',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),{...entry,score:1e12}));
  await denied('Cannot write stale timestamp',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),{...entry,t:1}));
  await denied('Cannot write extra data',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),{...entry,admin:true}));
  await denied('Cannot write malformed record ID',set(ref(player,'lb/retro-kombat/bad'),entry));
  await denied('Cannot write invalid Casino mode',set(ref(player,'lb/spyder-blackjack/pn-demo012345abc'),{...entry,mode:'CHEAT'}));
  await denied('Casino scores require mode',set(ref(player,'lb/spyder-holdem/pn-demo012345abc'),entry));
  await denied('Non-Casino scores reject Casino mode',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),{...entry,mode:'ANALYSIS'}));

  await ok('Retro Kombat authenticated score',set(ref(player,'lb/retro-kombat/pn-demo012345abc'),entry));
  await ok('Casino standard mode score',set(ref(player,'lb/spyder-blackjack/pn-demo012345abc'),{...entry,mode:'STANDARD'}));
  await ok('Casino analysis mode score',set(ref(player,'lb/spyder-holdem/pn-demo012345abc'),{...entry,mode:'ANALYSIS'}));
  console.log('FIREBASE_RULES_PASS '+n+' checks');
 }finally{await env.cleanup()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
