/* PIXEL-NET one-button install where the platform permits.
 * Apple iOS requires an Add to Home Screen interaction; no script may bypass it.
 * Player initials are saved locally by the existing homepage / wrapper controls.
 */
(() => {
  'use strict';
  const scriptURL = document.currentScript && document.currentScript.src;
  const appRoot = new URL('./', scriptURL || location.href);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  let pendingInstall = null;
  let popup = null;
  const buttons = [];

  function makeButton(className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-install-btn ' + className;
    btn.textContent = '↓ Install PIXEL-NET';
    btn.setAttribute('aria-label', 'Install PIXEL-NET as an app');
    btn.addEventListener('click', () => { void install(); });
    buttons.push(btn);
    return btn;
  }

  function showHelp() {
    if (popup) popup.remove();
    popup = document.createElement('div');
    popup.className = 'px-install-cover';
    const card = document.createElement('div');
    card.className = 'px-install-dialog';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Install PIXEL-NET');
    const header = document.createElement('h2');
    header.textContent = 'Install PIXEL-NET';
    const intro = document.createElement('p');
    const steps = document.createElement('ol');
    const items = isIOS
      ? ['Tap Share in your browser (the square with an up arrow).',
         'Choose Add to Home Screen, enable Open as Web App, and tap Add.']
      : isAndroid
      ? ['Open your browser menu and select Install app or Add to Home screen.',
         'Confirm the browser installation.']
      : ['Choose Install app in your browser menu or address bar (Safari Mac: File → Add to Dock).',
         'Confirm the browser installation.'];
    intro.textContent = isIOS
      ? 'Apple requires these home-screen steps. A website cannot install an iPhone app automatically.'
      : 'This browser has not provided the native install prompt.';
    for (const message of items) {
      const li = document.createElement('li');
      li.textContent = message;
      steps.appendChild(li);
    }
    const close = document.createElement('button');
    close.className = 'px-install-close';
    close.type = 'button';
    close.textContent = 'Got it';
    close.addEventListener('click', () => { popup.remove(); popup = null; });
    card.append(header, intro, steps, close);
    popup.appendChild(card);
    popup.addEventListener('click', e => { if (e.target === popup) close.click(); });
    document.body.appendChild(popup);
    close.focus();
  }

  async function install() {
    if (standalone()) return;
    if (pendingInstall) {
      const event = pendingInstall;
      pendingInstall = null;
      try {
        // Must originate directly from button click, not a timer or background task.
        await event.prompt();
        if (event.userChoice) {
          const result = await event.userChoice;
          if (result.outcome === 'accepted') buttons.forEach(b => { b.hidden = true; });
        }
      } catch (err) {
        showHelp();
      }
      return;
    }
    if (!location.pathname.startsWith(appRoot.pathname)) {
      // Root legacy homepage is outside the PWA scope.
      location.assign(new URL('index.html', appRoot));
      return;
    }
    showHelp();
  }

  function addStyle() {
    const sheet = document.createElement('style');
    sheet.textContent = [
      '.px-install-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;',
      'min-height:44px;padding:11px 16px;border:1px solid #00f5ff;border-radius:11px;',
      'color:#071122;background:linear-gradient(105deg,#00f5ff,#c150ed);cursor:pointer;',
      'font:800 12px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.11em;',
      'text-transform:uppercase;box-shadow:0 4px 20px #00f5ff33;max-width:100%;text-align:center}',
      '.px-install-btn:focus-visible{outline:3px solid #ffea00;outline-offset:3px}',
      '.px-install-btn:hover{filter:brightness(1.1)}',
      '.px-install-btn[hidden]{display:none}',
      '.px-install-inline{width:100%;margin-top:12px}',
      '.px-install-header{margin:12px auto 0;display:flex}',
      '.px-install-wrapper{font-size:10px;padding:7px 10px;min-height:36px;letter-spacing:.04em}',
      '.px-install-cover{position:fixed;inset:0;z-index:9999;background:#020414df;',
      'display:flex;align-items:center;justify-content:center;padding:20px}',
      '.px-install-dialog{width:min(440px,100%);padding:24px;border:2px solid #00f5ff;',
      'border-radius:20px;background:linear-gradient(145deg,#11152e,#1d0c32);',
      'box-shadow:0 16px 70px #000a;color:#f4f6ff;font:500 15px/1.5 system-ui,sans-serif}',
      '.px-install-dialog h2{margin:0 0 8px;color:#54f5ff;font-size:21px}',
      '.px-install-dialog p{margin:6px 0 15px}',
      '.px-install-dialog ol{margin:0 0 16px;padding-left:22px}',
      '.px-install-dialog li{margin:8px 0}',
      '.px-install-close{padding:12px 20px;background:#00f5ff;border:0;border-radius:9px;',
      'font-weight:800;color:#080d27;cursor:pointer}',
      '@media(max-width:480px){.px-install-dialog{padding:18px}.px-install-header{margin-top:9px}}'
    ].join('');
    document.head.appendChild(sheet);
  }

  function registerServiceWorker() {
    // Installed iOS apps have separate storage and their own first launch.
    if ('serviceWorker' in navigator && location.pathname.startsWith(appRoot.pathname)) {
      const register = () => {
        navigator.serviceWorker.register(new URL('sw.js', appRoot), { scope: appRoot.pathname })
          .catch(err => console.warn('Install support unavailable:', err.message));
      };
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once:true });
    }
  }
  function setup() {
    registerServiceWorker();
    if (standalone()) return;
    addStyle();
    const modalButton = document.querySelector('#initialModal .btn-save');
    if (modalButton)
      modalButton.insertAdjacentElement('afterend', makeButton('px-install-inline'));
    const wrapperModalButton = document.getElementById('saveInitials');
    if (wrapperModalButton)
      wrapperModalButton.insertAdjacentElement('afterend', makeButton('px-install-inline px-install-wrapper'));
    // Keep wrapper topbar three-column: install stays within initials modal.
    const player = document.getElementById('playerInitials');
    if (player) player.insertAdjacentElement('afterend', makeButton('px-install-header'));
    if (!buttons.length) document.body.appendChild(makeButton('px-install-header'));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstall = event;
  });
  window.addEventListener('appinstalled', () => {
    pendingInstall = null;
    buttons.forEach(btn => { btn.hidden = true; });
    if (popup) { popup.remove(); popup = null; }
  });
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', () => {
    if (standalone()) buttons.forEach(btn => { btn.hidden = true; });
  });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', setup, {once:true});
  else setup();
})();
