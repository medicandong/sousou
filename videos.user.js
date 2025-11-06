// ==UserScript==
// @name         华为浏览器风格视频助手（Edge 手机版·自动横屏最终版）
// @namespace    https://github.com/yourname/edge-video-helper
// @version      2.1.0
// @description  Edge 手机版一键自动横/竖屏全屏，无需打开系统旋转开关
// @author       YourName
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==UserScript==

/*  ********  使用说明  ********
1. 播放视频 → 右下角出现 🍀 四叶草按钮
2. 点击「全屏播放」→ 立即自动横屏（或竖屏），**无视系统旋转开关**
3. 系统返回键 / 侧滑 / 点击「退出」均正常恢复方向
*****************************  */

(() => {
'use strict';

const $ = (s, p = document) => p.querySelector(s);
const fmt = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

const ratio = v => v.videoWidth / v.videoHeight;
const isLandscape = v => ratio(v) >= 1.35;
const isPortrait  = v => ratio(v) <= 1.05;

/* ======== 方向锁定（用户手势同步栈内调用） ======== */
const lock = (land = true) => {
  if (!screen.orientation) return;
  const mode = land ? 'landscape' : 'portrait';
  screen.orientation.lock(mode).catch(()=>{});
};
const unlock = () => screen.orientation?.unlock();

/* ======== 四叶草按钮 ======== */
let clover = null;
function ensureClover(){
  if (clover) return clover;
  clover = document.createElement('div');
  clover.innerHTML = '🍀';
  Object.assign(clover.style,{
    position:'fixed',zIndex:10000,right:'20px',bottom:'80px',
    width:'48px',height:'48px',background:'rgba(0,0,0,.8)',borderRadius:'50%',
    display:'flex',alignItems:'center',justifyContent:'center',
    color:'#fff',fontSize:'24px',boxShadow:'0 2px 8px rgba(0,0,0,.4)',userSelect:'none'
  });
  document.body.appendChild(clover);

  /* 拖拽 */
  let dx,dy;
  clover.addEventListener('touchstart',e=>{const t=e.touches[0];dx=t.clientX-clover.offsetLeft;dy=t.clientY-clover.offsetTop;},{passive:true});
  document.addEventListener('touchmove',e=>{const t=e.touches[0];clover.style.left=(t.clientX-dx)+'px';clover.style.top=(t.clientY-dy)+'px';clover.style.right='auto';clover.style.bottom='auto';},{passive:true});
  clover.onclick = togglePanel;
  return clover;
}

/* ======== 控制面板 ======== */
let panel = null;
function togglePanel(){
  if (!panel) createPanel();
  panel.style.display = panel.style.display==='none'?'block':'none';
}
function createPanel(){
  panel = document.createElement('div');
  Object.assign(panel.style,{position:'fixed',right:'20px',bottom:'140px',zIndex:10001,background:'rgba(0,0,0,.9)',borderRadius:'12px',padding:'12px',minWidth:'180px',display:'none',boxShadow:'0 4px 16px rgba(0,0,0,.5)'});
  panel.innerHTML = `
    <div style="color:#fff;font-size:14px;margin-bottom:10px">播放设置</div>
    <button id="vp-full" style="width:100%;margin-bottom:8px">全屏播放</button>
    <button id="vp-speed" style="width:100%;margin-bottom:8px">倍速选择</button>
    <button id="vp-size" style="width:100%">画面尺寸</button>
  `;
  document.body.appendChild(panel);
  $('#vp-full').onclick  = enterSmartFullscreen;
  $('#vp-speed').onclick = ()=>showSpeedMenu();
  $('#vp-size').onclick  = ()=>showSizeMenu();
}

/* ======== 智能全屏（Edge 自动横屏核心） ======== */
let oriParent = null, oriStyle = '', fsWrap = null, currVid = null;

function enterSmartFullscreen(){
  const v = currVid; if (!v) return;
  oriParent = v.parentNode; oriStyle = v.style.cssText;

  /* ① 在用户手势同步栈内先锁定方向 → Edge 才生效 */
  const needLand = isLandscape(v);
  lock(needLand);                       // ← 关键修复

  /* ② 创建全屏容器 */
  fsWrap = document.createElement('div'); fsWrap.className = 'vp-fs-wrap';
  Object.assign(fsWrap.style,{position:'fixed',left:0,top:0,width:'100vw',height:'100vh',background:'#000',zIndex:999999,display:'flex',alignItems:'center',justifyContent:'center'});
  fsWrap.appendChild(v); document.body.appendChild(fsWrap);
  v.style.cssText = 'width:100%;height:100%;object-fit:contain';

  /* ③ 底部控制栏 */
  buildFSBar(fsWrap,v);

  /* ④ 历史栈+物理返回兜底 */
  history.pushState({vpFs:true},''); window.addEventListener('popstate',onBackWhileFS);
  document.addEventListener('visibilitychange',onVisibility);
}
function exitSmartFullscreen(){
  if (!fsWrap) return; unlock(); window.removeEventListener('popstate',onBackWhileFS); document.removeEventListener('visibilitychange',onVisibility);
  if (history.state&&history.state.vpFs) history.back();
  const v=currVid; oriParent.appendChild(v); v.style.cssText=oriStyle; fsWrap.remove(); fsWrap=null;
}
function onBackWhileFS(e){ if (fsWrap) { e.preventDefault(); exitSmartFullscreen(); } }
function onVisibility(){ if (document.hidden&&fsWrap) exitSmartFullscreen(); }

/* ======== 全屏底栏（直接绑定，防拦截） ======== */
function buildFSBar(container,v){
  const bar = document.createElement('div'); bar.className = 'vp-fs-bar';
  Object.assign(bar.style,{position:'absolute',left:'50%',bottom:'20px',transform:'translateX(-50%)',background:'rgba(0,0,0,.7)',borderRadius:'20px',padding:'8px 16px',display:'flex',alignItems:'center',gap:'12px',zIndex:1000000});
  bar.innerHTML = `
    <span id="vp-time" style="color:#fff;font-size:12px">0:00 / 0:00</span>
    <input type="range" id="vp-prog" style="width:140px" min="0" max="100" value="0">
    <button id="vp-rate" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">1.0x</button>
    <button id="vp-scale" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">原始</button>
    <button id="vp-exit" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px">退出</button>
  `;
  container.appendChild(bar);
  const prog = $('#vp-prog',bar);
  prog.oninput = ()=>v.currentTime = (prog.value/100)*v.duration;
  v.ontimeupdate = ()=>{ $('#vp-time',bar).textContent = fmt(v.currentTime)+' / '+fmt(v.duration); prog.value = (v.currentTime/v.duration)*100; };
  /* 直接绑定，避免 Edge 拦截 */
  $('#vp-rate',bar).onclick  = ()=>showSpeedMenu(bar);
  $('#vp-scale',bar).onclick = ()=>showSizeMenu(bar);
  $('#vp-exit',bar).onclick  = exitSmartFullscreen;
}

/* ======== 倍速 & 画面尺寸 ========= */
const rates = [0.5,1,1.25,1.5,1.75,2,2.25,2.5,3];
const sizes = { 填充:'cover', 拉伸:'fill', 适应:'contain', 原始:'none' };
function showSpeedMenu(anchor){ const m = createMenu(rates.map(r=>r+'x'),t=>{v.playbackRate=parseFloat(t);updateRateDisplay(parseFloat(t));}); placeMenu(m,anchor); }
function showSizeMenu(anchor){ const m = createMenu(Object.keys(sizes),t=>{v.style.objectFit=sizes[t];updateSizeDisplay(t);}); placeMenu(m,anchor); }
function updateRateDisplay(r){ const btn=$('#vp-rate')||$('#vp-rate',fsWrap); if(btn) btn.textContent=r+'x'; }
function updateSizeDisplay(s){ const btn=$('#vp-scale')||$('#vp-scale',fsWrap); if(btn) btn.textContent=s; }

function createMenu(items,cb){
  const old=$('.vp-menu'); if(old) old.remove();
  const box=document.createElement('div'); box.className='vp-menu';
  Object.assign(box.style,{position:'fixed',background:'rgba(0,0,0,.9)',borderRadius:'8px',padding:'6px 0',zIndex:10002,minWidth:'120px'});
  items.forEach(it=>{const row=document.createElement('div'); row.textContent=it; Object.assign(row.style,{padding:'10px 14px',color:'#fff',fontSize:'14px',cursor:'pointer'}); row.onclick=()=>{cb(it);box.remove();}; box.appendChild(row);});
  document.body.appendChild(box); return box;
}
function placeMenu(menu,anchor){const rect=anchor.getBoundingClientRect();menu.style.bottom=(innerHeight-rect.top+6)+'px';menu.style.left=Math.max(10,rect.left)+'px';}

/* ======== 检测视频（保留手势触发） ======== */
function scanVideo(){
  document.querySelectorAll('video').forEach(v=>{
    if(v.dataset.vpHandled) return;
    v.dataset.vpHandled='1';
    if(v.readyState>=2){currVid=v; ensureClover().style.display='flex';}
    v.addEventListener('play',()=>{currVid=v; ensureClover().style.display='flex';},{once:false});
  });
}
let gestureDone=false;
window.addEventListener('touchstart',()=>{
  if(gestureDone) return; gestureDone=true; scanVideo(); new MutationObserver(scanVideo).observe(document,{childList:true,subtree:true});
},{once:true});

/* 点击空白关面板/菜单 */
addEventListener('click',e=>{
  if(panel&&!panel.contains(e.target)&&!clover.contains(e.target)) panel.style.display='none';
  const menu=$('.vp-menu'); if(menu&&!menu.contains(e.target)) menu.remove();
});
})();
