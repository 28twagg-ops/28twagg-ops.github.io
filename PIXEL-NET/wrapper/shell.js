// PIXEL-NET shared arcade shell.
// Firebase global score reads are public; writes MUST be authenticated
// and permitted by the project owner's Firebase Realtime Database rules.
// Do not use TEST mode or unrestricted public write permissions.
const FIREBASE_DB_URL = "https://pixel-net-arcade-default-rtdb.firebaseio.com";
// Web API key is a PUBLIC client configuration value, NOT a service account key.
// A blank value deliberately disables authenticated uploads until configured.
const FIREBASE_WEB_API_KEY = "";
// See PIXEL-NET/wrapper/FIREBASE_SETUP.md.
(() => {
  const CFG = (window.PX_WRAPPER || {});
  const T = CFG.theme || {};
  const root = document.documentElement;

  // Apply per-game theme
  if (T.hero)  root.style.setProperty('--hero',  T.hero);
  if (T.hero2) root.style.setProperty('--hero2', T.hero2);
  if (T.bg0)   root.style.setProperty('--bg0',   T.bg0);
  if (T.bg2)   root.style.setProperty('--bg2',   T.bg2);

  const title = CFG.title || 'PIXEL-NET';
  root.dataset.game = String(CFG.slug||'unknown').replace(/[^a-z0-9-]/gi,'');
  document.title = title + ' — PIXEL-NET';

  const instructions = Array.isArray(CFG.instructions) ? CFG.instructions : [];
  const esc = s => String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
  const fmt = s => esc(s)
    .replace(/\bArrow Keys\b/gi,'<span class="kbd">↑</span><span class="kbd">↓</span><span class="kbd">←</span><span class="kbd">→</span>')
    .replace(/\bWASD\b/gi,'<span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>')
    .replace(/\bSpace\b/gi,'<span class="kbd">SPACE</span>')
    .replace(/\bEnter\b/gi,'<span class="kbd">ENTER</span>');
  const iconFor = s => {
    const t = String(s || '').toLowerCase();
    if (/move|navigate|steer|flap|control|arrow|wasd/.test(t)) return '🎮';
    if (/shoot|fire|bomb|attack|combat/.test(t)) return '⚡';
    if (/objective|goal|collect|cross|clear|survive/.test(t)) return '🎯';
    if (/score|leaderboard|save|submit/.test(t)) return '🏆';
    return '•';
  };
  const buildInstructionCard = line => {
    const raw = String(line || '');
    const parts = raw.split(':');
    if (parts.length > 1) {
      const action = fmt(parts.shift().trim());
      const detail = fmt(parts.join(':').trim());
      const icon = iconFor(raw);
      return `<div class="instrCard"><div class="instrAction"><span class="i">${icon}</span> ${action}</div><div class="instrDetail">${detail}</div></div>`;
    }
    // Avoid rendering an arrow pad for unrelated text such as 'up to ×8'.
    const looksDirectional = /^(?:move|steer|navigate|controls?|arrow keys|wasd|use (?:the )?arrows?)\b/i.test(raw.trim());
    if (looksDirectional) {
      return `<div class="instrCard diagramCard"><div class="instrAction"><span class="i">🎮</span> ${fmt(raw)}</div><div class="arrowPad"><span class="kbd up">↑</span><span class="kbd left">←</span><span class="kbd down">↓</span><span class="kbd right">→</span></div></div>`;
    }
    const icon = iconFor(raw);
    return `<div class="instrCard"><div class="instrDetail"><span class="i">${icon}</span> ${fmt(raw)}</div></div>`;
  };

  const globalBadge = '<span class="badge lbState" data-lb-status>CHECKING</span>';
  const stepsHTML   = instructions.map(buildInstructionCard).join('');
  const isSpyderCasino = (CFG.slug || '').toLowerCase() === 'spyder-casino';
  const desktopBoardHTML = isSpyderCasino
    ? `<div style="display:grid;grid-template-columns:1fr;gap:10px">
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Standard ${globalBadge}</h3><div class="boardStack" id="boardDesktopBjStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Analysis ${globalBadge}</h3><div class="boardStack" id="boardDesktopBjAn"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Standard ${globalBadge}</h3><div class="boardStack" id="boardDesktopHeStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Analysis ${globalBadge}</h3><div class="boardStack" id="boardDesktopHeAn"></div></div>
       </div>`
    : `<div class="boardStack" id="boardDesktop"></div>`;
  const mobileBoardHTML = isSpyderCasino
    ? `<div style="display:grid;grid-template-columns:1fr;gap:10px">
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Standard ${globalBadge}</h3><div class="boardStack" id="boardMobileBjStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Blackjack · Analysis ${globalBadge}</h3><div class="boardStack" id="boardMobileBjAn"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Standard ${globalBadge}</h3><div class="boardStack" id="boardMobileHeStd"></div></div>
         <div><h3 style="margin:0 0 6px 0;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);">Hold'em · Analysis ${globalBadge}</h3><div class="boardStack" id="boardMobileHeAn"></div></div>
       </div>`
    : `<div class="boardStack" id="boardMobile"></div>`;

  // Inject markup
  document.body.innerHTML = `
    <div class="topbar">
      <div class="top-left"><a class="exit" href="../../index.html" id="exitBtn">✕ EXIT</a></div>
      <div class="gameBadge" id="gameBadge">${title.toUpperCase()}<span class="verTag" id="verTag">version: ...</span></div>
      <div class="playerBtn" id="playerBtn" role="button" aria-label="Set player initials">
        <span class="muted">PLAYER</span><strong id="initials">???</strong>
      </div>
    </div>

    <div class="shell">
      <div class="panel">
        <h3>How To Play</h3>
        <div class="content">
          <div id="instructionsDesktop" class="instructionGrid">${stepsHTML}</div>
        </div>
      </div>
      <div class="center">
        <div class="frame" id="gameFrame">
          <iframe id="gameDesktop" allow="gamepad *; fullscreen *; autoplay"></iframe>
        </div>
      </div>
      <div class="panel leaderboard">
        <h3>Leaderboard ${globalBadge}</h3>
        <div class="content"><div class="boardNotice" id="boardNoticeDesktop" role="status">Checking online scores…</div>${desktopBoardHTML}</div>
      </div>
    </div>

    <div class="mobileWrap">
      <div class="mobileStack">
        <div class="displayZone">
          <div class="displayCard mobileFrame" id="view-game">
            <iframe id="gameMobile" allow="gamepad *; fullscreen *; autoplay"></iframe>
          </div>
          <div class="panel displayCard hidden" id="view-howto">
            <div class="content">
              <div id="instructionsMobile" class="instructionGrid">${stepsHTML}</div>
            </div>
          </div>
          <div class="panel leaderboard displayCard hidden" id="view-board">
            <h3 style="margin:0;padding:11px 14px;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,246,255,.60);border-bottom:1px solid rgba(255,255,255,.08);">Leaderboard ${globalBadge}</h3>
            <div class="content"><div class="boardNotice" id="boardNoticeMobile" role="status">Checking online scores…</div>${mobileBoardHTML}</div>
          </div>
        </div>
        <div class="btnbar">
          <button class="tabBtn active" data-tab="game" type="button">▶ Game</button>
          <button class="tabBtn" data-tab="howto" type="button">? How To</button>
          <button class="tabBtn" data-tab="board" type="button">🏆 Scores</button>
        </div>
      </div>
    </div>

    <div class="modalBack" id="modalBack" aria-hidden="true">
      <div class="modalCard" role="dialog" aria-modal="true">
        <button class="modalClose" id="modalClose" type="button">✕</button>
        <div class="modalInner">
          <div class="modalTitle">Enter Initials</div>
          <input class="modalInput" id="initialsInput" maxlength="3" placeholder="— — —" />
          <button class="modalSave" id="saveInitials" type="button">Save</button>
          <div class="modalHint">Press Enter to save</div>
        </div>
      </div>
    </div>
  `;
  for(const id of ['view-howto','view-board']){
    const panel=document.getElementById(id);
    if(panel)panel.dataset.cabinet=title.toUpperCase();
  }
  async function loadVersionTag() {
    const el = document.getElementById('verTag');
    if (!el) return;
    try {
      const r = await fetch('../../version.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('version missing');
      const d = await r.json();
      const raw = (d && d.version) ? String(d.version).trim() : 'unknown';
      const normalized = raw.replace(/^v/i, '');
      el.textContent = `version: ${normalized}`;
    } catch (_) {
      el.textContent = 'version: n/a';
    }
  }
  loadVersionTag();

  // App install entry on every game page; manifest/start page are shared.
  const appManifest=document.createElement('link');
  appManifest.rel='manifest';
  appManifest.href='../../manifest.webmanifest';
  document.head.appendChild(appManifest);
  const appIcon=document.createElement('link');
  appIcon.rel='apple-touch-icon';
  appIcon.href='../../icons/arcade-192.png';
  document.head.appendChild(appIcon);
  const appInstallScript=document.createElement('script');
  appInstallScript.src='../../install.js';
  appInstallScript.defer=true;
  document.body.appendChild(appInstallScript);

  // --- Aspect ratio: prevent game canvas stretching ---
  // CSS aspect-ratio is unreliable on iframes (no intrinsic size).
  // We compute pixel dimensions in JS and re-apply on every resize.
  if (CFG.aspectRatio) {
    const [rw, rh] = CFG.aspectRatio.split('/').map(Number);
    const ratio = rw / rh;

    const fitFrame = (container, frame) => {
      if (!container || !frame) return;
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (!availW || !availH) return;
      const w = availW / availH > ratio
        ? Math.floor(availH * ratio)   // height-constrained → width = h × ratio
        : availW;                       // width-constrained  → width = availW
      const h = Math.round(w / ratio);
      frame.style.width  = w + 'px';
      frame.style.height = h + 'px';
      frame.style.flex   = '0 0 auto';
    };

    const desktopFrame  = document.getElementById('gameFrame');
    const desktopCenter = document.querySelector('.center');
    const mobileFrame   = document.getElementById('view-game');
    const mobileZone    = document.querySelector('.displayZone');

    const refit = () => {
      fitFrame(desktopCenter, desktopFrame);
      fitFrame(mobileZone,    mobileFrame);
    };

    // Run once after layout is ready, then on every resize
    requestAnimationFrame(refit);
    if (window.ResizeObserver) {
      new ResizeObserver(refit).observe(desktopCenter);
      new ResizeObserver(refit).observe(mobileZone);
    } else {
      window.addEventListener('resize', refit);
    }
  }

  // --- Initials (shared across all games, all tabs) ---
  const KEY_MAIN = 'PIXELNET_INITIALS';
  const KEY_ALT  = 'playerInitials';
  const clean = s => (s||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
  const getInitials = () =>
    localStorage.getItem(KEY_MAIN) || localStorage.getItem(KEY_ALT) ||
    sessionStorage.getItem(KEY_ALT) || '???';
  const setInitialsAll = v => {
    localStorage.setItem(KEY_MAIN, v);
    localStorage.setItem(KEY_ALT, v);
    sessionStorage.setItem(KEY_ALT, v);
  };
  const renderInitials = () => {
    const el = document.getElementById('initials');
    if (el) el.textContent = getInitials();
  };
  renderInitials();
  window.addEventListener('storage', e => {
    if (e.key === KEY_MAIN || e.key === KEY_ALT) renderInitials();
  });

  // Exit: prefer history.back, fallback to home
  document.getElementById('exitBtn').addEventListener('click', e => {
    if (history.length > 1) { e.preventDefault(); history.back(); }
  });

  // --- Iframe setup ---
  const entry = CFG.entry || './game.html';
  const gd = document.getElementById('gameDesktop');
  const gm = document.getElementById('gameMobile');
  // Only the visible game should execute. Previously both frames were
  // loaded simultaneously, duplicating audio, animation and possible score events.
  const narrowScreen = window.matchMedia('(max-width: 1100px)');
  let activeGame = null;
  const activateGameFrame = () => {
    const chosen = narrowScreen.matches ? gm : gd;
    if (chosen === activeGame) return;
    const inactive = chosen === gd ? gm : gd;
    // Crossing the desktop/mobile breakpoint starts a fresh game instance.
    // Do not attempt to preserve a running game's opaque internal state.
    if (inactive.hasAttribute('src')) inactive.removeAttribute('src');
    if (!chosen.hasAttribute('src')) chosen.setAttribute('src', entry);
    activeGame = chosen;
  };
  activateGameFrame();
  if (narrowScreen.addEventListener) narrowScreen.addEventListener('change', activateGameFrame);
  else if (narrowScreen.addListener) narrowScreen.addListener(activateGameFrame);

  const focusFrame = el => {
    try { el.focus(); } catch(_) {}
    try { el.contentWindow && el.contentWindow.focus && el.contentWindow.focus(); } catch(_) {}
  };
  gd.addEventListener('load', () => { if(activeGame === gd) focusFrame(gd); });
  gm.addEventListener('load', () => { if(activeGame === gm) focusFrame(gm); });
  document.getElementById('gameFrame')?.addEventListener('pointerdown', () => focusFrame(gd));
  document.getElementById('view-game')?.addEventListener('pointerdown', () => focusFrame(gm));

  // --- Leaderboard: slug + local storage keys ---
  const slug = CFG.slug || (location.pathname.split('/').filter(Boolean).slice(-2,-1)[0] || 'unknown');
  const LB_KEY = `LB_${slug}`;
  const LEGACY_KEYS = [
    `PIXELNET_LB_${slug}_v2_0`,
    `PIXELNET_LB_${slug}_v2_0`.replace(/-/g,'_'),
    `PIXELNET_LB_${slug}`,
  ];

  const lbLoadRaw = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch(_) { return []; } };
  const lbSave    = arr => { try { localStorage.setItem(LB_KEY, JSON.stringify(arr || [])); } catch(_) {} };

  // Migrate legacy keys on first run
  (function migrate(){
    if (lbLoadRaw(LB_KEY).length) return;
    for (const k of LEGACY_KEYS) {
      const v = lbLoadRaw(k);
      if (Array.isArray(v) && v.length) { lbSave(v); break; }
    }
  })();

  const lbLoad = () => {
    let rows = lbLoadRaw(LB_KEY);
    try {
      if (rows.length >= 5) {
        const ini = rows.map(r => String((r && (r.initials || r.name)) || '').toUpperCase().slice(0,3));
        const allSame = ini.every(x => x && x === ini[0]);
        if ((allSame && ini[0] === 'JRF') || rows.some(r => r && (r.seeded || r.demo))) {
          localStorage.removeItem(LB_KEY);
          rows = [];
        }
      }
    } catch(_) {}
    return Array.isArray(rows) ? rows : [];
  };

  // This is a GLOBAL leaderboard only if the remote database actually responds.
  const cleanScore=value=>Number.isFinite(Number(value))
    ?Math.max(0,Math.floor(Number(value))):0;
  const cleanMode=value=>String(value||'STANDARD').toUpperCase().startsWith('A')
    ?'ANALYSIS':'STANDARD';
  const cloudURL=key=>FIREBASE_DB_URL
    ?FIREBASE_DB_URL+'/lb/'+encodeURIComponent(key)+'.json':null;
  const setStatus=(ok,message)=>{
    for(const e of document.querySelectorAll('[data-lb-status]')){
      e.textContent=ok?'GLOBAL LIVE':'LOCAL ONLY';
      e.dataset.status=ok?'online':'error';e.title=message;
    }
    for(const id of ['boardNoticeDesktop','boardNoticeMobile']){
      const e=document.getElementById(id);
      if(e){e.textContent=message;e.dataset.status=ok?'online':'error'}
    }
  };
  const normalizeRows=data=>{
    if(!data||typeof data!=='object')return [];
    return Object.values(data).filter(x=>x&&Number.isFinite(Number(x.score)))
      .map(x=>({initials:clean(x.initials||x.name)||'???',
        score:cleanScore(x.score),mode:cleanMode(x.mode),t:Number(x.t)||0}))
      .sort((a,b)=>b.score-a.score||a.t-b.t).slice(0,40);
  };
  async function fbFetch(board=slug){
    if(!cloudURL(board))return {ok:false,rows:[],reason:'Global database not configured.'};
    try{
      const res=await fetch(cloudURL(board),{cache:'no-store'});
      if(!res.ok)return {ok:false,rows:[],reason:
        res.status===401||res.status===403?'Database permission denied.':
        'Global scores unavailable (HTTP '+res.status+').'};
      return {ok:true,rows:normalizeRows(await res.json())};
    }catch(_){return {ok:false,rows:[],reason:'Global database connection unavailable.'}}
  }
  // Anonymous Firebase Auth: a player needs no account or sign-in form.
  // Tokens expire; create another anonymous session when they do. Firebase
  // security rules must allow authenticated, create-only writes at /lb.
  let authPromise=null,authExpiry=0;
  async function getScoreToken(){
    if(!FIREBASE_WEB_API_KEY)return null;
    if(!authPromise || Date.now()>authExpiry-60000){
      authPromise=(async()=>{
        const res=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+
          encodeURIComponent(FIREBASE_WEB_API_KEY),{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({returnSecureToken:true})
        });
        if(!res.ok)throw new Error('Firebase anonymous sign-in failed');
        const data=await res.json();
        authExpiry=Date.now()+Math.max(60,Number(data.expiresIn)||3600)*1000;
        return data.idToken||null;
      })().catch(()=>{authExpiry=0;authPromise=null;return null});
    }
    return authPromise;
  }
  // A stable database key makes retries idempotent. If Firebase wrote a
  // score but the acknowledgement was lost, don't create a duplicate.
  async function fbPost(entry,board=slug,id){
    if(!FIREBASE_DB_URL || !id)return false;
    const token=await getScoreToken();
    if(!token)return false;
    const url=FIREBASE_DB_URL+'/lb/'+encodeURIComponent(board)+'/'+encodeURIComponent(id)+'.json';
    try{
      const res=await fetch(url+'?auth='+encodeURIComponent(token),{method:'PUT',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
      if(res.ok)return true;
      // A create-only policy can deny retrying a previously committed write.
      // Check the exact record before treating that denial as a failure.
      if(res.status===401||res.status===403){
        const check=await fetch(url,{cache:'no-store'});
        if(check.ok){
          const remote=await check.json();
          if(remote&&remote.initials===entry.initials&&remote.score===entry.score)return true;
        }
      }
      return false;
    }catch(_){return false}
  }
  const PENDING_KEY='PIXELNET_PENDING_SCORES_V1';
  const pendingLoad=()=>{
    try{const a=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');
      return Array.isArray(a)?a.filter(x=>x&&x.id&&x.board&&x.entry):[]}
    catch(_){return []}
  };
  const pendingSave=a=>{try{localStorage.setItem(PENDING_KEY,JSON.stringify(a.slice(-100)))}catch(_){}};
  const pendingRows=board=>pendingLoad().filter(x=>x.board===board)
    .map(x=>({...x.entry,pending:true}));
  const queueScore=(entry,board)=>{
    const id='pn-'+(crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14));
    pendingSave([...pendingLoad(),{id,board,entry}]);
    return id;
  };
  let draining=null;
  async function drainPending(){
    if(draining)return draining;
    draining=(async()=>{
      const done=[];
      if(!FIREBASE_WEB_API_KEY)return done;
      for(const item of pendingLoad()){
        // Use submission time for Firebase's server-time validation on retries.
        const payload={...item.entry,t:Date.now()};
        if(await fbPost(payload,item.board,item.id))done.push(item.id);
      }
      if(done.length)pendingSave(pendingLoad().filter(x=>!done.includes(x.id)));
      return done;
    })().finally(()=>{draining=null});
    return draining;
  }
  function renderBoard(id,rows){
    const el=document.getElementById(id);
    if(!el)return;
    el.replaceChildren();
    if(!rows.length){
      const empty=document.createElement('div');empty.className='small';
      empty.textContent='No scores on this board yet.';el.appendChild(empty);return;
    }
    rows.slice(0,10).forEach((entry,i)=>{
      const row=document.createElement('div');row.className='boardRow'+(i===0?' top1':'');
      const rank=document.createElement('div');rank.className='rank';rank.textContent=(i+1)+'.';
      const name=document.createElement('div');name.className='name';
      name.textContent=(clean(entry.initials||entry.name)||'???')+(entry.pending?' · LOCAL':'');
      const points=document.createElement('div');points.className='score';
      points.textContent=String(cleanScore(entry.score));
      row.append(rank,name,points);el.appendChild(row);
    });
  }
  const modeSplit=rows=>({
    std:rows.filter(r=>cleanMode(r.mode)!=='ANALYSIS').slice(0,10),
    an:rows.filter(r=>cleanMode(r.mode)==='ANALYSIS').slice(0,10)
  });
  let refreshId=0;
  const refreshBoards=async()=>{
    const id=++refreshId;
    if(isSpyderCasino){
      const [bj,he]=await Promise.all([fbFetch('spyder-blackjack'),fbFetch('spyder-holdem')]);
      if(id!==refreshId)return;
      const b=modeSplit(bj.ok?[...bj.rows,...pendingRows('spyder-blackjack')]:lbLoadRaw('LB_spyder-blackjack'));
      const h=modeSplit(he.ok?[...he.rows,...pendingRows('spyder-holdem')]:lbLoadRaw('LB_spyder-holdem'));
      for(const type of ['Desktop','Mobile']){
        renderBoard('board'+type+'BjStd',b.std);
        renderBoard('board'+type+'BjAn',b.an);
        renderBoard('board'+type+'HeStd',h.std);
        renderBoard('board'+type+'HeAn',h.an);
      }
      const ok=bj.ok&&he.ok;
      setStatus(ok,ok?'Live shared Blackjack and Hold’em rankings.':
        'Casino leaderboard is offline. Showing locally saved scores where available.');
      return;
    }
    const cloud=await fbFetch();
    if(id!==refreshId)return;
    const rows=cloud.ok?[...cloud.rows,...pendingRows(slug)]
      .sort((a,b)=>b.score-a.score||a.t-b.t):lbLoad();
    renderBoard('boardDesktop',rows);renderBoard('boardMobile',rows);
    setStatus(cloud.ok,cloud.ok?'Live global scores shared across devices.':
      cloud.reason+' Showing scores saved on this device.');
  };
  refreshBoards();
  let lastSig='',lastAt=0;
  async function addScore(rawScore,scoreSlug,scoreMode){
    const initials=clean(getInitials())||'YOU',score=cleanScore(rawScore),now=Date.now();
    const mode=cleanMode(scoreMode);
    const target=isSpyderCasino&&['spyder-blackjack','spyder-holdem'].includes(scoreSlug)
      ?scoreSlug:slug;
    const sig=target+':'+mode+':'+initials+':'+score;
    if(sig===lastSig&&now-lastAt<1200)return;
    lastSig=sig;lastAt=now;
    const entry={initials,score,t:now,...(isSpyderCasino?{mode}:{})};
    const key='LB_'+target,rows=lbLoadRaw(key);
    rows.push(entry);
    rows.sort((a,b)=>(b.score||0)-(a.score||0)||(a.t||0)-(b.t||0));
    try{localStorage.setItem(key,JSON.stringify(rows.slice(0,30)))}catch(_){}
    const id=queueScore(entry,target);
    await refreshBoards();
    const done=await drainPending();
    const globalSaved=done.includes(id);
    // Let every game display honest global-upload confirmation or fallback.
    if(activeGame?.contentWindow){
      activeGame.contentWindow.postMessage(
        {type:'PIXELNET_SCORE_STATUS',localSaved:true,globalSaved},location.origin);
    }
    await refreshBoards();
    if(!globalSaved){
      for(const noticeId of ['boardNoticeDesktop','boardNoticeMobile']){
        const node=document.getElementById(noticeId);
        if(node){node.dataset.status='error';
          node.textContent='Score saved on this device; queued for global upload.';}
      }
    }
  }
  window.addEventListener('online',()=>drainPending().then(refreshBoards));
  // Retry an interrupted score submission when the player next opens a game.
  setTimeout(()=>drainPending().then(refreshBoards),1200);

  // Listen for score / initials messages from iframed games
  window.addEventListener('message', e => {
    // Only accept messages from the active child game, never the inactive
    // blank frame or unrelated windows. All hosted custom games are same-origin.
    if (!activeGame || e.source !== activeGame.contentWindow || e.origin !== location.origin) return;
    const d = e.data || {};
    if (!d || !d.type) return;
    if (d.type === 'PIXELNET_SET_INITIALS' && d.initials) {
      const v = clean(d.initials);
      if (v) { setInitialsAll(v); renderInitials(); }
      return;
    }
    if (d.type === 'GAME_OVER_SCORE' || d.type === 'GAME_OVER' ||
        d.type === 'PIXELNET_SCORE'  || d.type === 'PIXELNET_SUBMIT_SCORE') {
      const s = d.score != null ? d.score : (d.finalScore != null ? d.finalScore : d.value);
      if (s != null) addScore(s, d.slug, d.mode);
    }
  });

  // --- Initials modal ---
  const modalBack = document.getElementById('modalBack');
  const input = document.getElementById('initialsInput');
  const openModal = () => {
    modalBack.style.display = 'flex';
    modalBack.setAttribute('aria-hidden','false');
    input.value = getInitials().replace(/\?/g,'');
    input.focus(); input.select();
  };
  const closeModal = () => {
    modalBack.style.display = 'none';
    modalBack.setAttribute('aria-hidden','true');
  };
  document.getElementById('playerBtn').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalBack.addEventListener('click', e => { if (e.target === modalBack) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalBack.style.display === 'flex') closeModal();
  });
  function saveNow(){
    const v = clean(input.value);
    if (!v) return;
    setInitialsAll(v); renderInitials(); closeModal();
  }
  document.getElementById('saveInitials').addEventListener('click', saveNow);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveNow(); });

  // --- Mobile tab switcher ---
  const btns = document.querySelectorAll('.tabBtn');
  const views = {
    game:  document.getElementById('view-game'),
    howto: document.getElementById('view-howto'),
    board: document.getElementById('view-board'),
  };
  const setTab = tab => {
    Object.keys(views).forEach(k => views[k].classList.toggle('hidden', k !== tab));
    btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'game') setTimeout(() => focusFrame(gm), 50);
    if (tab === 'board') refreshBoards();
  };
  btns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
})();
