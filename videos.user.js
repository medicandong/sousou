// ==UserScript==
// @name         网页视频播放助手-pro
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  手机浏览器播放视频助手，支持强制横屏全屏、倍速、画面尺寸调整
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /* --------------------------------------------------------------
     * 基础工具
     * -------------------------------------------------------------- */
    const log = (...args) => console.log('[VideoAssistant]', ...args);
    const lockOrientation = (angle) => {
        const fn = screen.orientation
            ? () => screen.orientation.lock(angle).catch(() => log('lock失败'))
            : () => log('浏览器不支持orientation.lock');
        fn();
    };
    const unlockOrientation = () => {
        screen.orientation && screen.orientation.unlock();
    };

    /* --------------------------------------------------------------
     * 状态变量
     * -------------------------------------------------------------- */
    let curVideo = null;
    let floatBtn = null;
    let panel = null;
    let fsControls = null;
    let fsFlag = false;

    const playRates = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3];
    const aspectModes = ['原始', '适应', '拉伸', '填充'];
    let curRate = 1;
    let curAspect = '原始';

    /* --------------------------------------------------------------
     * 悬浮四叶草按钮
     * -------------------------------------------------------------- */
    function createFloatBtn() {
        if (floatBtn) return;
        floatBtn = document.createElement('div');
        floatBtn.innerHTML = '🍀';
        Object.assign(floatBtn.style, {
            position: 'fixed',
            width: '40px',
            height: '40px',
            background: 'rgba(0,0,0,.7)',
            color: '#fff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            zIndex: 999999,
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            boxShadow: '0 2px 10px rgba(0,0,0,.3)',
            transition: 'all .3s'
        });
        floatBtn.onclick = showPanel;
        document.body.appendChild(floatBtn);
    }

    /* --------------------------------------------------------------
     * 控制面板
     * -------------------------------------------------------------- */
    function createPanel() {
        if (panel) return;
        panel = document.createElement('div');
        panel.innerHTML = `
            <div style="text-align:center;font-size:16px;margin-bottom:10px;">播放设置</div>
            <button id="fsBtn" style="padding:10px;background:#2196F3;color:#fff;border:none;border-radius:5px;width:100%;">全屏播放</button>
            <button id="rateBtn" style="padding:10px;background:#4CAF50;color:#fff;border:none;border-radius:5px;width:100%;">倍速选择</button>
            <button id="closePanel" style="padding:10px;background:#f44336;color:#fff;border:none;border-radius:5px;width:100%;">关闭</button>
        `;
        Object.assign(panel.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'rgba(0,0,0,.9)',
            color: '#fff',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 1e6,
            display: 'none',
            flexDirection: 'column',
            gap: '15px',
            minWidth: '200px'
        });
        document.body.appendChild(panel);

        panel.querySelector('#fsBtn').onclick = enterFullscreen;
        panel.querySelector('#rateBtn').onclick = () => showMenu('rate');
        panel.querySelector('#closePanel').onclick = hidePanel;
    }
    function showPanel() { panel.style.display = 'flex'; }
    function hidePanel() { panel.style.display = 'none'; }

    /* --------------------------------------------------------------
     * 强制横屏全屏
     * -------------------------------------------------------------- */
    function enterFullscreen() {
        if (!curVideo) return;
        hidePanel();

        // 1. 先锁横屏
        lockOrientation('landscape');

        // 2. 进入全屏
        const el = curVideo;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
        req && req.call(el);

        // 3. 标记状态
        fsFlag = true;

        // 4. 创建顶部控制条
        createFsControls();
    }

    function exitFullscreen() {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
        exit && exit.call(document);
        unlockOrientation();
        fsFlag = false;
        fsControls && fsControls.remove();
        fsControls = null;
    }

    /* --------------------------------------------------------------
     * 全屏内控制条
     * -------------------------------------------------------------- */
    function createFsControls() {
        if (fsControls) return;
        fsControls = document.createElement('div');
        fsControls.id = 'va_fsbar';
        fsControls.innerHTML = `
            <span>进度条</span>
            <input type="range" id="va_progress" min="0" max="100" value="0" style="width:100px;">
            <button id="va_rate">${curRate}</button>
            <button id="va_aspect">${curAspect}</button>
            <button id="va_exit">退出</button>
        `;
        Object.assign(fsControls.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,.8)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '25px',
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            zIndex: 1e6
        });
        document.body.appendChild(fsControls);

        // 事件
        const progress = fsControls.querySelector('#va_progress');
        progress.oninput = e => {
            if (!curVideo.duration) return;
            curVideo.currentTime = (e.target.value / 100) * curVideo.duration;
        };
        curVideo.ontimeupdate = () => {
            if (!curVideo.duration) return;
            progress.value = (curVideo.currentTime / curVideo.duration) * 100;
        };

        fsControls.querySelector('#va_rate').onclick = () => showMenu('rate');
        fsControls.querySelector('#va_aspect').onclick = () => showMenu('aspect');
        fsControls.querySelector('#va_exit').onclick = exitFullscreen;
    }

    /* --------------------------------------------------------------
     * 上拉菜单
     * -------------------------------------------------------------- */
    function showMenu(type) {
        const old = document.getElementById('va_menu');
        old && old.remove();

        const menu = document.createElement('div');
        menu.id = 'va_menu';
        Object.assign(menu.style, {
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,.9)',
            color: '#fff',
            padding: '10px',
            borderRadius: '10px',
            zIndex: 1e7,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        });

        const list = type === 'rate' ? playRates : aspectModes;
        list.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = type === 'rate' ? item + 'x' : item;
            btn.style.cssText = 'background:transparent;color:#fff;border:1px solid #fff;padding:8px 15px;border-radius:5px;cursor:pointer;';
            if ((type === 'rate' && item === curRate) || (type === 'aspect' && item === curAspect)) {
                btn.style.background = '#2196F3';
            }
            btn.onclick = () => {
                if (type === 'rate') {
                    curRate = item;
                    curVideo.playbackRate = item;
                    updateFsText('va_rate', item);
                } else {
                    curAspect = item;
                    applyAspect(item);
                    updateFsText('va_aspect', item);
                }
                menu.remove();
            };
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        setTimeout(() => {
            const close = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
            document.addEventListener('click', close);
        }, 100);
    }

    function updateFsText(id, val) {
        const btn = document.getElementById(id);
        if (btn) btn.textContent = val;
    }

    function applyAspect(mode) {
        if (!curVideo) return;
        const map = { '原始': 'none', '适应': 'contain', '拉伸': 'fill', '填充': 'cover' };
        curVideo.style.objectFit = map[mode] || 'contain';
    }

    /* --------------------------------------------------------------
     * 视频探测与挂载
     * -------------------------------------------------------------- */
    function attachVideo(v) {
        if (v.dataset.vaAttached) return;
        v.dataset.vaAttached = '1';

        v.addEventListener('play', () => {
            curVideo = v;
            createFloatBtn();
            createPanel();
        });

        v.addEventListener('ended', () => {
            if (v === curVideo) {
                floatBtn && (floatBtn.style.display = 'none');
                if (fsFlag) exitFullscreen();
            }
        });
    }

    function scanVideo() {
        document.querySelectorAll('video').forEach(attachVideo);
    }

    /* --------------------------------------------------------------
     * 启动
     * -------------------------------------------------------------- */
    function init() {
        scanVideo();
        new MutationObserver(() => scanVideo()).observe(document.body, { childList: true, subtree: true });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && fsFlag) exitFullscreen();
        });
        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement && fsFlag) exitFullscreen();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
