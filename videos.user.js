// ==UserScript==
// @name         手机Edge视频播放助手-真全屏版
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  手机Edge浏览器网页视频播放助手，实现真正的全屏功能
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: ['填充', '拉伸', '适应', '原始']
    };

    let currentVideo = null;
    let isFullscreen = false;
    let originalStyles = {};
    let currentPlaybackRate = 1.0;
    let currentVideoSize = '适应';

    // 创建移动端优化的悬浮按钮
    function createMobileFloatingButton() {
        const button = document.createElement('div');
        button.innerHTML = `
            <style>
                .mobile-video-assistant {
                    position: fixed;
                    right: 16px;
                    bottom: 80px;
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    touch-action: manipulation;
                }
                
                .mobile-video-assistant::before {
                    content: '';
                    width: 24px;
                    height: 24px;
                    background: white;
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'/%3E%3C/svg%3E");
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'/%3E%3C/svg%3E");
                }

                .mobile-bottom-menu {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(20px);
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                    padding: 16px;
                    z-index: 10001;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                }
                
                .mobile-bottom-menu.show {
                    transform: translateY(0);
                }
                
                .menu-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .close-btn {
                    width: 24px;
                    height: 24px;
                    background: white;
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
                    cursor: pointer;
                }
                
                .menu-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                
                .menu-item {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: background 0.2s ease;
                }
                
                .menu-item:active {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .mobile-fullscreen-controls {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.9));
                    padding: 20px 16px;
                    display: none;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 10002;
                    color: white;
                }
                
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .control-item {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 10px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    min-width: 60px;
                    text-align: center;
                    cursor: pointer;
                }
                
                .progress-container {
                    flex: 1;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    margin: 0 12px;
                    position: relative;
                }
                
                .progress-bar {
                    height: 100%;
                    background: #4ecdc4;
                    border-radius: 2px;
                    width: 0%;
                }
                
                .options-panel {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.95);
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                    padding: 16px;
                    z-index: 10003;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                }
                
                .options-panel.show {
                    transform: translateY(0);
                }
                
                .options-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-top: 16px;
                }
                
                .option-item {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px 8px;
                    text-align: center;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .option-item.active {
                    background: #4ecdc4;
                    color: black;
                }
                
                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9999;
                    display: none;
                }
                
                .overlay.show {
                    display: block;
                }

                /* 真正的全屏样式 */
                .video-fullscreen-mode {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 9998 !important;
                    background: black !important;
                    object-fit: contain !important;
                }
                
                .fullscreen-backdrop {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: black !important;
                    z-index: 9997 !important;
                }
                
                /* 隐藏页面其他元素 */
                body.video-fullscreen-active * {
                    visibility: hidden !important;
                }
                
                body.video-fullscreen-active .video-fullscreen-mode,
                body.video-fullscreen-active .fullscreen-backdrop,
                body.video-fullscreen-active .mobile-fullscreen-controls {
                    visibility: visible !important;
                }
            </style>
            
            <div class="mobile-video-assistant" id="mobileVideoAssistant"></div>
            
            <div class="mobile-bottom-menu" id="mobileBottomMenu">
                <div class="menu-header">
                    <span>播放设置</span>
                    <div class="close-btn" id="closeMenuBtn"></div>
                </div>
                <div class="menu-grid">
                    <div class="menu-item" id="mobileFullscreenBtn">全屏播放</div>
                    <div class="menu-item" id="playbackRateBtn">倍速选择</div>
                    <div class="menu-item" id="videoSizeBtn">画面尺寸</div>
                </div>
            </div>
            
            <div class="mobile-fullscreen-controls" id="mobileFullscreenControls">
                <div class="control-group">
                    <div class="progress-container" id="mobileProgressContainer">
                        <div class="progress-bar" id="mobileProgressBar"></div>
                    </div>
                </div>
                <div class="control-group">
                    <div class="control-item" id="mobileRateDisplay">1.0</div>
                    <div class="control-item" id="mobileSizeDisplay">适应</div>
                    <div class="control-item" id="mobileExitFullscreen">退出</div>
                </div>
            </div>
            
            <div class="options-panel" id="playbackRatePanel">
                <div class="menu-header">
                    <span>选择播放倍速</span>
                    <div class="close-btn" id="closeRatePanel"></div>
                </div>
                <div class="options-grid" id="playbackRateOptions"></div>
            </div>
            
            <div class="options-panel" id="videoSizePanel">
                <div class="menu-header">
                    <span>选择画面尺寸</span>
                    <div class="close-btn" id="closeSizePanel"></div>
                </div>
                <div class="options-grid" id="videoSizeOptions"></div>
            </div>
            
            <div class="overlay" id="overlay"></div>
        `;

        document.body.appendChild(button);
        setupEventListeners();
    }

    function setupEventListeners() {
        const assistant = document.getElementById('mobileVideoAssistant');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const fullscreenBtn = document.getElementById('mobileFullscreenBtn');
        const playbackRateBtn = document.getElementById('playbackRateBtn');
        const videoSizeBtn = document.getElementById('videoSizeBtn');
        const overlay = document.getElementById('overlay');
        
        assistant.addEventListener('click', showBottomMenu);
        closeMenuBtn.addEventListener('click', hideBottomMenu);
        overlay.addEventListener('click', hideAllPanels);
        fullscreenBtn.addEventListener('click', toggleMobileFullscreen);
        playbackRateBtn.addEventListener('click', showPlaybackRatePanel);
        videoSizeBtn.addEventListener('click', showVideoSizePanel);
        
        document.getElementById('mobileExitFullscreen').addEventListener('click', exitMobileFullscreen);
        document.getElementById('mobileRateDisplay').addEventListener('click', showPlaybackRatePanel);
        document.getElementById('mobileSizeDisplay').addEventListener('click', showVideoSizePanel);
        
        document.getElementById('mobileProgressContainer').addEventListener('click', (e) => {
            if (currentVideo && isFullscreen) {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                currentVideo.currentTime = percent * currentVideo.duration;
            }
        });
        
        initOptionsPanels();
    }

    function initOptionsPanels() {
        const rateOptions = document.getElementById('playbackRateOptions');
        rateOptions.innerHTML = CONFIG.playbackRates.map(rate => `
            <div class="option-item ${rate === 1.0 ? 'active' : ''}" data-rate="${rate}">${rate}x</div>
        `).join('');
        
        const sizeOptions = document.getElementById('videoSizeOptions');
        sizeOptions.innerHTML = CONFIG.videoSizes.map(size => `
            <div class="option-item ${size === '适应' ? 'active' : ''}" data-size="${size}">${size}</div>
        `).join('');
        
        rateOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const rate = parseFloat(item.getAttribute('data-rate'));
                setPlaybackRate(rate);
                currentPlaybackRate = rate;
                document.getElementById('mobileRateDisplay').textContent = rate.toFixed(2);
                rateOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                hideAllPanels();
            });
        });
        
        sizeOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const size = item.getAttribute('data-size');
                setVideoSize(size);
                currentVideoSize = size;
                document.getElementById('mobileSizeDisplay').textContent = size;
                sizeOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                hideAllPanels();
            });
        });
        
        document.getElementById('closeRatePanel').addEventListener('click', hideAllPanels);
        document.getElementById('closeSizePanel').addEventListener('click', hideAllPanels);
    }

    function showBottomMenu() {
        document.getElementById('mobileBottomMenu').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function hideBottomMenu() {
        document.getElementById('mobileBottomMenu').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    function hideAllPanels() {
        hideBottomMenu();
        document.getElementById('playbackRatePanel').classList.remove('show');
        document.getElementById('videoSizePanel').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    function showPlaybackRatePanel() {
        document.getElementById('playbackRatePanel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function showVideoSizePanel() {
        document.getElementById('videoSizePanel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function toggleMobileFullscreen() {
        if (!isFullscreen) {
            enterMobileFullscreen();
        }
        hideBottomMenu();
    }

    // 智能判断横竖屏
    function shouldUseLandscape(video) {
        if (!video.videoWidth || !video.videoHeight) return true;
        const aspectRatio = video.videoWidth / video.videoHeight;
        return aspectRatio > 1.2;
    }

    // 进入真正的全屏模式
    function enterMobileFullscreen() {
        if (!currentVideo) return;
        
        console.log('进入真正全屏模式');
        
        // 保存原始状态
        originalStyles = {
            position: currentVideo.style.position,
            width: currentVideo.style.width,
            height: currentVideo.style.height,
            top: currentVideo.style.top,
            left: currentVideo.style.left,
            zIndex: currentVideo.style.zIndex,
            objectFit: currentVideo.style.objectFit,
            parent: currentVideo.parentElement
        };
        
        // 创建全屏背景
        const backdrop = document.createElement('div');
        backdrop.className = 'fullscreen-backdrop';
        document.body.appendChild(backdrop);
        
        // 将视频移动到body最顶层
        document.body.appendChild(currentVideo);
        
        // 应用全屏样式
        currentVideo.classList.add('video-fullscreen-mode');
        Object.assign(currentVideo.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '9998',
            backgroundColor: '#000',
            objectFit: getObjectFitValue(currentVideoSize)
        });
        
        // 隐藏页面其他内容
        document.body.classList.add('video-fullscreen-active');
        
        // 显示控制栏
        document.getElementById('mobileFullscreenControls').style.display = 'flex';
        document.getElementById('mobileVideoAssistant').style.display = 'none';
        
        isFullscreen = true;
        
        // 智能横屏处理
        if (shouldUseLandscape(currentVideo)) {
            console.log('视频为横向，尝试横屏显示');
            lockScreenOrientation('landscape');
        }
        
        // 开始更新进度
        updateProgress();
    }

    // 退出全屏
    function exitMobileFullscreen() {
        if (!currentVideo) return;
        
        console.log('退出全屏模式');
        
        // 移除全屏样式
        currentVideo.classList.remove('video-fullscreen-mode');
        document.body.classList.remove('video-fullscreen-active');
        
        // 移除全屏背景
        const backdrop = document.querySelector('.fullscreen-backdrop');
        if (backdrop) backdrop.remove();
        
        // 恢复视频到原始位置
        if (originalStyles.parent) {
            originalStyles.parent.appendChild(currentVideo);
        }
        
        // 恢复原始样式
        Object.keys(originalStyles).forEach(prop => {
            if (prop !== 'parent') {
                currentVideo.style[prop] = originalStyles[prop];
            }
        });
        
        // 隐藏控制栏
        document.getElementById('mobileFullscreenControls').style.display = 'none';
        document.getElementById('mobileVideoAssistant').style.display = 'flex';
        
        // 解锁屏幕方向
        unlockScreenOrientation();
        
        isFullscreen = false;
    }

    // 锁定屏幕方向
    function lockScreenOrientation(orientation) {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock(orientation).catch(e => {
                    console.log('屏幕方向锁定失败:', e);
                });
            }
        } catch (e) {
            console.log('屏幕方向锁定异常:', e);
        }
    }

    // 解锁屏幕方向
    function unlockScreenOrientation() {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) {
            console.log('屏幕方向解锁失败:', e);
        }
    }

    // 获取object-fit值
    function getObjectFitValue(size) {
        switch (size) {
            case '填充': return 'cover';
            case '拉伸': return 'fill';
            case '适应': return 'contain';
            case '原始': return 'none';
            default: return 'contain';
        }
    }

    // 设置播放倍速
    function setPlaybackRate(rate) {
        if (currentVideo) {
            currentVideo.playbackRate = rate;
        }
    }

    // 设置视频尺寸
    function setVideoSize(size) {
        if (currentVideo && isFullscreen) {
            currentVideo.style.objectFit = getObjectFitValue(size);
        }
    }

    // 更新进度条
    function updateProgress() {
        if (currentVideo && isFullscreen) {
            const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
            document.getElementById('mobileProgressBar').style.width = progress + '%';
            requestAnimationFrame(updateProgress);
        }
    }

    // 检测视频元素
    function detectVideo() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            if (!video.hasAttribute('data-mobile-assistant')) {
                video.setAttribute('data-mobile-assistant', 'true');
                
                video.addEventListener('play', () => {
                    currentVideo = video;
                    document.getElementById('mobileVideoAssistant').style.display = 'flex';
                });
                
                video.addEventListener('pause', () => {
                    if (!isFullscreen) {
                        document.getElementById('mobileVideoAssistant').style.display = 'none';
                    }
                });
                
                video.addEventListener('ended', () => {
                    document.getElementById('mobileVideoAssistant').style.display = 'none';
                    if (isFullscreen) {
                        exitMobileFullscreen();
                    }
                });
            }
        });
    }

    // 初始化
    function init() {
        setTimeout(() => {
            createMobileFloatingButton();
            detectVideo();
            
            setInterval(detectVideo, 2000);
            
            const observer = new MutationObserver(detectVideo);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('手机Edge视频播放助手-真全屏版已加载');
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
