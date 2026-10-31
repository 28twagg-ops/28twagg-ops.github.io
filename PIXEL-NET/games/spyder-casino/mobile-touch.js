// Spyder Casino: green terminal stays the same; phones get tappable shortcuts.
(() => {
 'use strict';
 const mobile=()=>matchMedia('(pointer:coarse)').matches&&innerWidth<=1100;
 const bar=document.createElement('nav');
 bar.id='pnCasinoTouch';bar.setAttribute('aria-label','Mobile casino commands');
 document.body.appendChild(bar);
 let signature='';
 function setButtons(actions){
  const sig=actions.map(x=>x[0]).join('|');
  if(sig===signature)return;
  signature=sig;bar.replaceChildren();
  for(const [title,handler] of actions){
   const b=document.createElement('button');b.type='button';b.textContent=title;
   b.addEventListener('click',()=>{handler();update();});
   bar.appendChild(b);
  }
 }
 function update(){
  if(!mobile()){bar.style.display='none';return;}
  bar.style.display='flex';
  const screen=document.querySelector('.screen.active')?.id;
  if(screen==='lobbyScreen')return setButtons([
   ['BJ STANDARD',()=>startBJ('STANDARD')],['BJ ANALYSIS',()=>startBJ('ANALYSIS')],
   ["HOLD'EM",()=>startHE('STANDARD')],['HE ANALYSIS',()=>startHE('ANALYSIS')]
  ]);
  if(screen==='bjScreen'){
    if(bjPhase==='bet')return setButtons([
      ['+$5',()=>bjAddBet(5)],['+$10',()=>bjAddBet(10)],
      ['+$25',()=>bjAddBet(25)],['+$50',()=>bjAddBet(50)],
      ['CLEAR',bjClearBet],['DEAL',()=>{if(bjBet>=BJ_MIN)bjDeal()}],
      ['LOBBY',goLobby]
    ]);
    if(bjPhase==='play')return setButtons([
      ['HIT',bjHit],['STAY',bjStay],['DOUBLE',bjDouble],
      ['SPLIT',bjSplit],['CASH OUT',bjCashOut]
    ]);
    return setButtons([['NEXT HAND',bjNextHand],['CASH OUT',bjCashOut],['LOBBY',goLobby]]);
  }
  if(screen==='heScreen'){
    if(heTerminalResult)return setButtons([['NEXT HAND',heNextHand],['QUIT',heQuit]]);
    if(heAwaitingRaiseAmount)return setButtons([
      ['MIN RAISE',()=>heRunTerminalCommand('')],['CANCEL',()=>heRunTerminalCommand('cancel')],
      ['FOLD',()=>heRunTerminalCommand('f')]
    ]);
    return setButtons([
      ['CALL / CHECK',()=>heRunTerminalCommand('c')],
      ['RAISE',()=>heRunTerminalCommand('r')],
      ['FOLD',()=>heRunTerminalCommand('f')],['QUIT',heQuit]
    ]);
  }
  if(screen==='endScreen')return setButtons([['LOBBY',goLobby]]);
  setButtons([]);
 }
 setInterval(update,220);update();
})();