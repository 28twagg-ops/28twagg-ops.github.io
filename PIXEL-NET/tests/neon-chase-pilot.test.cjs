// Run from the repo root: node PIXEL-NET/tests/neon-chase-pilot.test.cjs
// No libraries, network requests, Firebase writes or production scores.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../games/neon-chase-v2/game.html'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'game script exists');
new vm.Script(script, { filename: 'neon-chase.js' });
function readArray(name) {
  const m = source.match(new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);'));
  assert.ok(m, 'array ' + name);
  return vm.runInNewContext('(' + m[1] + ')');
}
const maps = readArray('LEVEL_MAPS');
const spawnData = readArray('LEVEL_SPAWNS');
assert.equal(maps.length, 3, 'three repeating maps');
assert.equal(spawnData.length, 3, 'spawn config per map');
for (let k = 0; k < maps.length; k++) {
  const grid = maps[k], spawn = spawnData[k];
  assert.equal(grid.length, 20);
  assert.ok(grid.every(row => row.length === 19));
  for (const [x,y] of [spawn.player, ...spawn.drones]) {
    assert.ok(grid[y]?.[x] !== undefined && grid[y][x] !== 1, 'zone ' + (k+1) + ' spawn');
  }
  const seen = new Set([spawn.player.join(',')]);
  const queue = [spawn.player];
  for (let i = 0; i < queue.length; i++) {
    const [x,y] = queue[i];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx=x+dx, yy=y+dy, key=xx+','+yy;
      if (grid[yy]?.[xx] !== undefined && grid[yy][xx] !== 1 && !seen.has(key)) {
        seen.add(key); queue.push([xx, yy]);
      }
    }
  }
  for (let y=0; y<grid.length; y++) for (let x=0; x<grid[y].length; x++) {
    if ([2,3].includes(grid[y][x])) {
      assert.ok(seen.has(x+','+y), 'zone ' + (k+1) + ' pellet ' + x + ',' + y);
    }
  }
}
const nodes = {};
const canvasCtx = new Proxy({}, {
  get(o,k){ return k in o ? o[k] : () => {}; },
  set(o,k,v){ o[k]=v; return true; }
});
function element(id){
  return nodes[id] ||= {
    style: {}, classList: { add(){}, remove(){} }, clientWidth:456, clientHeight:480,
    addEventListener(){}, getContext(){ return canvasCtx; },
    querySelector(){ return {style:{}}; }
  };
}
class AudioStub {
  constructor(){ this.currentTime=0; this.destination={}; this.state='running'; }
  createOscillator(){ return {
    frequency:{setValueAtTime(){}}, connect(){}, start(){}, stop(){}
  }; }
  createGain(){ return {
    gain:{setValueAtTime(){}, exponentialRampToValueAtTime(){}}, connect(){}
  }; }
  resume(){}
}
const events = [];
let timerId = 0;
const callbacks = new Map();
const later = fn => { callbacks.set(++timerId, fn); return timerId; };
const cancel = id => {callbacks.delete(id);};
const sandbox = {
  window:{AudioContext:AudioStub,addEventListener(){}},
  document:{getElementById:element},
  location:{search:''}, URLSearchParams,
  parent:{postMessage:data=>events.push(data)},
  setTimeout:later, setInterval:later, clearTimeout:cancel, clearInterval:cancel,
  __events:events
};
const checks = [
  'function ok(p,m){if(!p)throw Error(m)}',
  'function walkable(e){const p=e.getGridPos();return currentMapData[p.r][p.c]!==1}',
  'ok(walkable(player),"init spawn");startGame();',
  'ok(gameState==="PLAY"&&score===0&&lives===3,"start state");',
  'const x0=player.x;',
  'handleKey({code:"KeyD",key:"d",preventDefault(){}});',
  'ok(nextDir.x===1,"WASD mapped");player.update();',
  'ok(player.x>x0,"WASD actual movement");',
  'handleKey({code:"KeyP",key:"p",preventDefault(){}});',
  'ok(gameState==="PAUSED","pause");togglePause();ok(gameState==="PLAY","resume");',
  'playerInvulnTicks=0;killPlayer();ok(lives===2,"death");',
  'killPlayer();ok(lives===2,"no repeated hit in grace window");',
  'for(let k=1;k<=3;k++){level=k;resetLevel();',
  'ok(walkable(player)&&drones.every(walkable),"zone spawn "+k);',
  'for(const g of drones){g.x=player.x+5*TILE_SIZE;g.y=player.y;g.reset();',
  'ok(walkable(g),"drone respawn "+k)}}',
  'gameState="PLAY";score=123;gameOver();gameOver();',
  'ok(__events.length===1&&__events[0].score===123,"score only once");',
  'startGame();ok(score===0&&lives===3&&level===1&&particles.length===0&&powerModeTime===0,"restart cleared");',
  'score=7;gameOver();ok(__events.length===2&&__events[1].score===7,"one score per new run");'
].join('\n');
vm.runInNewContext(script+'\n'+checks,sandbox,{timeout:10000});
console.log('PASS: three maps and spawns; reachable collectibles; canvas draw;');
console.log('WASD movement; pause; death grace; drone respawn; restart; score event once per run.');
