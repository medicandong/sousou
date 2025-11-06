// ==UserScript==
// @name         华为浏览器风格视频助手（Edge 移动版专用·修复版）
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /* ==================== 以下与上一版相同，仅 scanVideo() 及初始化逻辑被替换 ==================== */

  const $ = (s, p = document) => p.querySelector(s);
  const ratio = (v) => v.videoWidth / v.videoHeight;
  const isPortraitVideo = (v) => ratio(v) <= 1.05;
  const isLandscapeVideo = (v) => ratio(v) >= 1.35;

  const lockOrient = (lock = true, mode = 'natural') => {
    if (!screen.orientation) return Promise.resolve();
    if (!lock) return screen.orientation.unlock();
    const m = mode === 'land' ? 'landscape' : mode === 'port' ? 'portrait' : (screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'landscape' : 'portrait');
    return screen.orientation.lock(m).catch(() => {});
  };

  /* ---------- 悬浮四叶草 ---------- */
  let cloverBtn = null;
  function ensureClover() {
    if (cloverBtn) return cloverBtn;
    cloverBtn = document.createElement('div');
    cloverBtn.innerHTML = '🍀';
    Object.assign(cloverBtn.style, {
      position: 'fixed', zIndex: 10000, right: '20px', bottom: '80px',
      width: '48px', height: '48px', background: 'rgba(0,0,0,.8)', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.4)', userSelect: 'none'
    });
    document.body.appendChild(cloverBtn);
    /* 拖拽 */
    let dx, dy;
    const onTouch = e => { const t = e.touches[0]; dx = t.clientX - cloverBtn.offsetLeft; dy = t.clientY - cloverBtn.offsetTop; };
    const onMove = e => { const t = e.touches[0]; cloverBtn.style.left = (t.clientX - dx) + 'px'; cloverBtn.style.top = (t.clientY - dy) + 'px'; cloverBtn.style.right = 'auto'; cloverBtn.style.bottom = 'auto'; };
    cloverBtn.addEventListener('touchstart', onTouch, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    cloverBtn.addEventListener('click', togglePanel);
    return cloverBtn;
  }

  /* ---------- 控制面板 ---------- */
  let panel = null;
  function togglePanel() {
    if (!panel) createPanel();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
  function createPanel() {
    panel = document.createElement('div');
    Object.assign(panel.style, { position: 'fixed', right: '20px', bottom: '140px', zIndex: 10001, background: 'rgba(0,0,0,.9)', borderRadius: '12px', padding: '12px', minWidth: '180px', display: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.5)' });
    panel.innerHTML = `
      <div style="color:#fff;font-size:14px;margin-bottom:10px">播放设置</div>
      <button id="vp-full" style="width:100%;margin-bottom:8px">全屏播放</button>
      <button id="vp-speed" style="width:100%;margin-bottom:8px">倍速选择</button>
      <button id="vp-size" style="width:100%">画面尺寸</button>
    `;
    document.body.appendChild(panel);
    $('#vp-full').onclick  = enterSmartFullscreen;
    $('#vp-speed').onclick = () => showSpeedMenu();
    $('#vp-size').onclick  = () => showSizeMenu();
  }

  /* ---------- 智能全屏 ---------- */
  let oriParent = null, oriStyle = '', fsWrap = null, currVid = null;

  function enterSmartFullscreen() {
    const v = currVid; if (!v) return;
    oriParent = v.parentNode; oriStyle = v.style.cssText;
    const want = isLandscapeVideo(v) ? 'land' : 'port';
    lockOrient(true, want);
    fsWrap = document.createElement('div'); fsWrap.className = 'vp-fs-wrap';
    Object.assign(fsWrap.style, { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' });
    fsWrap.appendChild(v); document.body.appendChild(fsWrap);
    v.style.cssText = 'width:100%;height:100%;object-fit:contain';
    buildFSBar(fsWrap, v);
    history.pushState({ vpFs: true }, '');
    window.addEventListener('popstate', onBackWhileFS);
  }
  function exitSmartFullscreen() {
    if (!fsWrap) return; lockOrient(false); window.removeEventListener('popstate', onBackWhileFS);
    if (history.state && history.state.vpFs) history.back();
    const v = currVid; oriParent.appendChild(v); v.style.cssText = oriStyle;
    fsWrap.remove(); fsWrap = null;
  }
  function onBackWhileFS(e) { if (fsWrap) { e.preventDefault(); exitSmartFullscreen(); } }

  /* ---------- 全屏底栏 ---------- */
  function buildFSBar(container, v) {
    const bar = document.createElement('div'); bar.className = 'vp-fs-bar';
    Object.assign(bar.style, { position: 'absolute', left: '50%', bottom: '20px', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.7)', borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1000000 });
    bar.innerHTML = `
      <span id="vp-time" style="color:#fff;font-size:12px">0:00 / 0:00</span>
      <input type="range" id="vp-prog" style="width:140px" min="0" max="100" value="0">
      <button id="vp-rate" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">1.0x</button>
      <button id="vp-scale" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">原始</button>
      <button id="vp-exit" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">退出</button>
    `;
    container.appendChild(bar);
    const prog = $('#vp-prog', bar);
    prog.oninput = () => v.currentTime = (prog.value / 100) * v.duration;
    v.ontimeupdate = () => { $('#vp-time', bar).textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration); prog.value = (v.currentTime / v.duration) * 100; };
    $('#vp-rate', bar).onclick  = () => showSpeedMenu(bar);
    $('#vp-scale', bar).onclick = () => showSizeMenu(bar);
    $('#vp-exit', bar).onclick  = exitSmartFullscreen;
  }

  /* ---------- 菜单 ---------- */
  const rates = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3];
  const sizes = { 填充: 'cover', 拉伸: 'fill', 适应: 'contain', 原始: 'none' };
  function showSpeedMenu(anchor) { const m = createMenu(rates.map(r => r + 'x'), t => { currVid.playbackRate = parseFloat(t); updateRateDisplay(parseFloat(t)); }); placeMenu(m, anchor || panel); }
  function showSizeMenu(anchor) { const m = createMenu(Object.keys(sizes), t => { currVid.style.objectFit = sizes[t]; updateSizeDisplay(t); }); placeMenu(m, anchor || panel); }
  function updateRateDisplay(r) { const btn = $('#vp-rate') || $('#vp-rate', fsWrap); if (btn) btn.textContent = r + 'x'; }
  function updateSizeDisplay(s) { const btn = $('#vp-scale') || $('#vp-scale', fsWrap); if (btn) btn.textContent = s; }
  function createMenu(items, cb) {
    const old = $('.vp-menu'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'vp-menu';
    Object.assign(box.style, { position: 'fixed', background: 'rgba(0,0,0,.9)', borderRadius: '8px', padding: '6px 0', zIndex: 10002, minWidth: '120px' });
    items.forEach(it => { const row = document.createElement('div'); row.textContent = it; Object.assign(row.style, { padding: '10px 14px', color: '#fff', fontSize: '14px', cursor: 'pointer' }); row.onclick = () => { cb(it); box.remove(); }; box.appendChild(row); });
    document.body.appendChild(box); return box;
  }
  function placeMenu(menu, anchor) { const rect = anchor.getBoundingClientRect(); menu.style.bottom = (innerHeight - rect.top + 6) + 'px'; menu.style.left = Math.max(10, rect.left) + 'px'; }

  /* ====================  修复核心：检测视频  ==================== */
  function scanVideo() {
    document.querySelectorAll('video').forEach(v => {
      if (v.dataset.vpHandled) return;
      v.dataset.vpHandled = '1';
      /* 1. 已经可播放就直接出按钮 */
      if (v.readyState >= 2) {
        currVid = v;
        ensureClover().style.display = 'flex';
      }
      /* 2. 后续任何一次播放都出按钮 */
      v.addEventListener('play', () => {
        currVid = v;
        ensureClover().style.display = 'flex';
      }, { once: false });
    });
  }

  /* Edge 必须等第一次用户手势后再扫描，否则 readyState 不可靠 */
  let gestureDone = false;
  window.addEventListener('touchstart', () => {
    if (gestureDone) return;
    gestureDone = true;
    scanVideo();                                       // 立即扫一次
    new MutationObserver(scanVideo).observe(document, { childList: true, subtree: true });
  }, { once: true });

  /* 点击空白处关闭面板/菜单 */
  addEventListener('click', e => {
    if (panel && !panel.contains(e.target) && !cloverBtn.contains(e.target)) panel.style.display = 'none';
    const menu = $('.vp-menu'); if (menu && !menu.contains(e.target)) menu.remove();
  });

  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
})();
