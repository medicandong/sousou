<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>手机端沉浸式视频播放器（HTML5 video）</title>
<style>
  html,body{margin:0;padding:0;height:100%;background:#111;color:#eee;font-family:system-ui,sans-serif;}
  .player-wrapper{position:relative;width:100%;height:100%;overflow:hidden;background:#000;}
  video{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border:none;}
  #immersiveBtn{
    position:absolute;right:20px;bottom:20px;width:48px;height:48px;
    background:url('https://metaso.cn/api/public-file/download?fileName=qwen_image_generated_images/4c0637bf-f16b-4916-9d61-855d1635f3c4.webp')
      no-repeat center/contain;cursor:pointer;z-index:10;opacity:.85;transition:opacity .2s;
  }
  #immersiveBtn:hover{opacity:1;}
  #fitPanel{
    position:absolute;left:20px;bottom:20px;background:rgba(0,0,0,.6);padding:6px 10px;
    border-radius:4px;z-index:10;color:#fff;font-size:14px;
  }
  #fitPanel select{background:#222;color:#fff;border:none;padding:2px 4px;}
  #errorMsg{
    position:absolute;top:20px;left:50%;transform:translateX(-50%);
    background:#b71c1c;color:#fff;padding:8px 12px;border-radius:4px;z-index:20;display:none;
  }
</style>
</head>
<body>

<div class="player-wrapper" id="playerContainer">
  <video id="videoPlayer" preload="metadata" controls>
    <source src="http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4" type="video/mp4">
    您的浏览器不支持 video 标签。
  </video>
</div>

<div id="immersiveBtn" title="沉浸式全屏"></div>

<div id="fitPanel">
  填充模式：
  <select id="fitSelect">
    <option value="cover">cover（默认）</option>
    <option value="contain">contain</option>
    <option value="fill">fill</option>
    <option value="none">none</option>
    <option value="scale-down">scale‑down</option>
  </select>
</div>

<div id="errorMsg"></div>

<script>
/* ---------- 基础变量 ---------- */
const video   = document.getElementById('videoPlayer');
const btn     = document.getElementById('immersiveBtn');
const select  = document.getElementById('fitSelect');
let isFull   = false;
let originalStyle = '';

/* ---------- 填充模式实现 ---------- */
function applyFit(mode){
  const wrapper = document.getElementById('playerContainer');
  const {width:W, height:H} = wrapper.getBoundingClientRect();
  const videoRatio = video.videoWidth / video.videoHeight || 16/9; // 若 metadata 未就绪则使用 16:9
  const wrapperRatio = W / H;

  let w, h; // 目标宽高

  switch(mode){
    case 'cover':
      if(wrapperRatio > videoRatio){ w = W; h = W / videoRatio; }
      else { h = H; w = H * videoRatio; }
      video.style.objectFit = 'cover';
      break;
    case 'contain':
      if(wrapperRatio > videoRatio){ h = H; w = H * videoRatio; }
      else { w = W; h = W / videoRatio; }
      video.style.objectFit = 'contain';
      break;
    case 'fill':
      w = W; h = H;
      video.style.objectFit = 'fill';
      break;
    case 'none':
      w = video.videoWidth || 560;
      h = video.videoHeight || 315;
      video.style.objectFit = 'none';
      break;
    case 'scale-down':
      // 先算 none 再算 contain，取更小者
      const noneW = video.videoWidth || 560;
      const noneH = video.videoHeight || 315;
      let containW, containH;
      if(wrapperRatio > videoRatio){ containH = H; containW = H * videoRatio; }
      else { containW = W; containH = W / videoRatio; }
      w = Math.min(noneW, containW);
      h = Math.min(noneH, containH);
      video.style.objectFit = 'none';
      break;
    default:
      w = W; h = H; video.style.objectFit = 'cover';
  }

  // 统一写入宽高属性，防止 API 重新覆盖
  video.width  = w;
  video.height = h;
  video.style.width  = `${w}px`;
  video.style.height = `${h}px`;
}

/* ---------- 监听填充模式切换 ---------- */
select.addEventListener('change', e => applyFit(e.target.value));

/* ---------- 窗口尺寸变化时重新计算 ---------- */
window.addEventListener('resize', () => applyFit(select.value));

/* ---------- 沉浸式全屏 ---------- */
async function enterImmersive(){
  if (!video.requestFullscreen) return;
  originalStyle = video.getAttribute('style') || '';
  try{
    await video.requestFullscreen();
    isFull = true;
    // 拦截左侧滑动返回（移动端）
    document.addEventListener('touchstart', blockLeftSwipe,{passive:false});
    document.addEventListener('touchmove',  blockLeftSwipe,{passive:false});
  }catch(e){ console.warn('Fullscreen request failed',e); }
}
async function exitImmersive(){
  if (!isFull) return;
  try{ await document.exitFullscreen(); }catch(e){}
  video.setAttribute('style', originalStyle);
  isFull = false;
  document.removeEventListener('touchstart', blockLeftSwipe);
  document.removeEventListener('touchmove',  blockLeftSwipe);
}
function blockLeftSwipe(e){
  if (!isFull) return;
  const touch = e.touches[0];
  if (touch.clientX < 50) e.preventDefault(); // 左侧 50 px 区域拦截返回手势
}
btn.addEventListener('click',()=>{ isFull?exitImmersive():enterImmersive(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && isFull) exitImmersive(); });

/* ---------- 视频元数据加载后首次计算 ---------- */
video.addEventListener('loadedmetadata',()=>{ applyFit(select.value); });

/* ---------- 错误提示 ---------- */
video.addEventListener('error',()=>{ 
  const msg = document.getElementById('errorMsg');
  msg.textContent = '视频加载失败，请检查网络或更换视频源。';
  msg.style.display = 'block';
});
</script>

</body>
</html>
