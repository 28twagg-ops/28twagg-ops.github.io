// PIXEL-NET native game on-screen controls. Emits the same keys as desktop.
(() => {
 'use strict';
 if(!('ontouchstart' in window) && !(navigator.maxTouchPoints>0) &&
    !window.matchMedia('(pointer: coarse)').matches)return;
 const buttons=[
  ['left','ArrowLeft','←'],['up','ArrowUp','↑'],['down','ArrowDown','↓'],
  ['right','ArrowRight','→'],['fire',' ','ACTION']
 ];
 const style=document.createElement('style');
 style.textContent=[
 '.pn-touch-controls{position:fixed;left:8px;right:8px;bottom:8px;z-index:50;display:flex;justify-content:space-between;align-items:end;pointer-events:none;user-select:none;-webkit-user-select:none}',
 '.pn-touch-pad{display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:4px;pointer-events:none}',
 '.pn-touch-controls button{display:flex;justify-content:center;align-items:center;min-width:46px;min-height:46px;border:2px solid rgba(255,255,255,.65);border-radius:12px;background:rgba(10,17,33,.72);color:#fff;font:700 22px system-ui;touch-action:none;pointer-events:auto;-webkit-tap-highlight-color:transparent}',
 '.pn-touch-controls button:active,.pn-touch-controls button.active{background:rgba(32,159,220,.86)}',
 '.pn-touch-controls button[data-pn-touch=up]{grid-column:2;grid-row:1}',
 '.pn-touch-controls button[data-pn-touch=left]{grid-column:1;grid-row:2}',
 '.pn-touch-controls button[data-pn-touch=down]{grid-column:2;grid-row:2}',
 '.pn-touch-controls button[data-pn-touch=right]{grid-column:3;grid-row:2}',
 '.pn-touch-controls button[data-pn-touch=fire]{min-width:78px;font-size:13px}',
 '@media (max-height:360px){.pn-touch-controls{bottom:2px}.pn-touch-pad{grid-template-columns:repeat(3,36px);grid-template-rows:repeat(2,36px)}.pn-touch-controls button{min-width:36px;min-height:36px}}',
 '@media (hover:hover) and (pointer:fine){.pn-touch-controls{display:none}}'
 ].join('');
 document.head.appendChild(style);
 const el=document.createElement('div');el.className='pn-touch-controls';el.setAttribute('aria-label','On-screen game controls');
 const pad=document.createElement('div');pad.className='pn-touch-pad';el.appendChild(pad);
 const action=document.createElement('div');action.className='pn-touch-action';el.appendChild(action);
 const held=new Map();
 function emit(type,key){const code=key===' '?'Space':key;window.dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true}));}
 for(const [name,key,label] of buttons){
   const button=document.createElement('button');button.type='button';
   button.dataset.pnTouch=name;button.textContent=label;button.setAttribute('aria-label',name==='fire'?'Fire, jump or throw':name);
   button.addEventListener('pointerdown',event=>{
     event.preventDefault();button.setPointerCapture?.(event.pointerId);
     held.set(event.pointerId,key);button.classList.add('active');emit('keydown',key);
   });
   const release=event=>{
     if(!held.has(event.pointerId))return;
     event.preventDefault();emit('keyup',held.get(event.pointerId));
     held.delete(event.pointerId);button.classList.remove('active');
   };
   button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
   button.addEventListener('lostpointercapture',release);
   (name==='fire'?action:pad).appendChild(button);
 }
 window.addEventListener('blur',()=>{for(const key of held.values())emit('keyup',key);held.clear();el.querySelectorAll('button').forEach(b=>b.classList.remove('active'));});
 document.body.appendChild(el);
})();