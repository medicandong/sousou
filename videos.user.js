// ==UserScript==
// @name         手机Edge视频播放助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  手机Edge浏览器网页视频播放助手，支持全屏、倍速、画面尺寸
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置项 - 针对移动端优化
    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: ['填充', '拉伸', '适应', '原始'],
        touchAreaSize: '44px', // 最小触摸区域
        buttonSize: '36px', // 按钮大小
        buttonPosition: '16px' // 按钮边距
    };

    let currentVideo = null;
    let isFullscreen = false;
    let originalStyles = {};
    let isMenuShowing = false;

    // 创建移动端优化的悬浮按钮
    function createMobileFloatingButton() {
        const button = document.createElement('div');
        button.innerHTML = `
            <style>
                /* 移动端悬浮按钮 */
                .mobile-video-assistant {
                    position: fixed;
                    right: ${CONFIG.buttonPosition};
                    bottom: 80px;
                    width: ${CONFIG.buttonSize};
                    height: ${CONFIG.buttonSize};
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
                    user-select: none;
                }
                
                .mobile-video-assistant::before {
                    content: '';
                    width: 20px;
                    height: 20px;
                    background: white;
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
                }

                /* 移动端底部菜单 */
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
                    touch-action: pan-y;
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
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
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
                    touch-action: manipulation;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: background 0.2s ease;
                }
                
                .menu-item:active {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                /* 全屏控制栏 */
                .mobile-fullscreen-controls {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    padding: 20px 16px;
                    display: none;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 10002;
                    color: white;
                    touch-action: manipulation;
                }
                
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }
                
                .control-item {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    min-width: 50px;
                    text-align: center;
                    cursor: pointer;
                    touch-action: manipulation;
                }
                
                .progress-container {
                    flex: 1;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    margin: 0 12px;
                    position: relative;
                    touch-action: pan-y;
                }
                
                .progress-bar {
                    height: 100%;
                    background: #4ecdc4;
                    border-radius: 2px;
                    width: 0%;
                }
                
                .progress-handle {
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    display: none;
                }
                
                /* 选项面板 */
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
                    font-size: 12px;
                    cursor: pointer;
                    touch-action: manipulation;
                }
                
                .option-item.active {
                    background: #4ecdc4;
                    color: black;
                }
                
                /* 遮罩层 */
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
            </style>
            
            <!-- 悬浮按钮 -->
            <div class="mobile-video-assistant" id="mobileVideoAssistant"></div>
            
            <!-- 底部菜单 -->
            <div class="mobile-bottom-menu" id="mobileBottomMenu">
                <div class="menu-header">
                    <span>播放设置</span>
                    <div class="close-btn" id="closeMenuBtn"></div>
                </div>
                <div class="menu-grid">
                    <div class="menu-item" id="mobileFullscreenBtn">全屏播放</div>
                    <div class="menu-item" id="playbackRateBtn">倍速选择</div>
                    <div class="menu-item" id="videoSizeBtn">画面尺寸</div>
                    <div class="menu-item" id="mobileExitBtn" style="display:none">退出全屏</div>
                </div>
            </div>
            
            <!-- 全屏控制栏 -->
            <div class="mobile-fullscreen-controls" id="mobileFullscreenControls">
                <div class="control-group">
                    <div class="progress-container" id="mobileProgressContainer">
                        <div class="progress-bar" id="mobileProgressBar"></div>
                        <div class="progress-handle" id="progressHandle"></div>
                    </div>
                </div>
                <div class="control-group" style="justify-content: flex-end; flex: none; gap: 8px;">
                    <div class="control-item" id="mobileRateDisplay">1.0</div>
                    <div class="control-item" id="mobileSizeDisplay">原始</div>
                    <div class="control-item" id="mobileExitFullscreen">退出</div>
                </div>
            </div>
            
            <!-- 倍速选项面板 -->
            <div class="options-panel" id="playbackRatePanel">
                <div class="menu-header">
                    <span>选择播放倍速</span>
                    <div class="close-btn" id="closeRatePanel"></div>
                </div>
                <div class="options-grid" id="playbackRateOptions"></div>
            </div>
            
            <!-- 尺寸选项面板 -->
            <div class="options-panel" id="videoSizePanel">
                <div class="menu-header">
                    <span>选择画面尺寸</span>
                    <div class="close-btn" id="closeSizePanel"></div>
                </div>
                <div class="options-grid" id="videoSizeOptions"></div>
            </div>
            
            <!-- 遮罩层 -->
            <div class="overlay" id="overlay"></div>
        `;

        document.body.appendChild(button);
        setupMobileEventListeners();
    }

    // 设置移动端事件监听
    function setupMobileEventListeners() {
        const assistant = document.getElementById('mobileVideoAssistant');
        const bottomMenu = document.getElementById('mobileBottomMenu');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const fullscreenBtn = document.getElementById('mobileFullscreenBtn');
        const playbackRateBtn = document.getElementById('playbackRateBtn');
        const videoSizeBtn = document.getElementById('videoSizeBtn');
        const exitBtn = document.getElementById('mobileExitBtn');
        const overlay = document.getElementById('overlay');
        
        // 悬浮按钮点击
        assistant.addEventListener('click', showBottomMenu);
        assistant.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showBottomMenu();
        });
        
        // 关闭菜单
        closeMenuBtn.addEventListener('click', hideBottomMenu);
        closeMenuBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            hideBottomMenu();
        });
        
        // 遮罩层点击关闭
        overlay.addEventListener('click', hideAllPanels);
        overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            hideAllPanels();
        });
        
        // 菜单项点击
        fullscreenBtn.addEventListener('click', toggleMobileFullscreen);
        playbackRateBtn.addEventListener('click', showPlaybackRatePanel);
        videoSizeBtn.addEventListener('click', showVideoSizePanel);
        exitBtn.addEventListener('click', exitMobileFullscreen);
        
        // 初始化选项面板
        initOptionsPanels();
        setupFullscreenControls();
    }

    // 初始化选项面板
    function initOptionsPanels() {
        // 初始化倍速选项
        const rateOptions = document.getElementById('playbackRateOptions');
        rateOptions.innerHTML = CONFIG.playbackRates.map(rate => `
            <div class="option-item" data-rate="${rate}">${rate}x</div>
        `).join('');
        
        // 初始化尺寸选项
        const sizeOptions = document.getElementById('videoSizeOptions');
        sizeOptions.innerHTML = CONFIG.videoSizes.map(size => `
            <div class="option-item" data-size="${size}">${size}</div>
        `).join('');
        
        // 倍速选项事件
        rateOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const rate = parseFloat(item.getAttribute('data-rate'));
                setPlaybackRate(rate);
                document.getElementById('mobileRateDisplay').textContent = rate.toFixed(2);
                hideAllPanels();
            });
        });
        
        // 尺寸选项事件
        sizeOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const size = item.getAttribute('data-size');
                setVideoSize(size);
                document.getElementById('mobileSizeDisplay').textContent = size;
                hideAllPanels();
            });
        });
        
        // 关闭按钮事件
        document.getElementById('closeRatePanel').addEventListener('click', hideAllPanels);
        document.getElementById('closeSizePanel').addEventListener('click', hideAllPanels);
    }

    // 设置全屏控制
    function setupFullscreenControls() {
        const progressContainer = document.getElementById('mobileProgressContainer');
        const exitFullscreenBtn = document.getElementById('mobileExitFullscreen');
        
        // 进度条点击
        progressContainer.addEventListener('click', (e) => {
            if (currentVideo) {
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                currentVideo.currentTime = percent * currentVideo.duration;
            }
        });
        
        // 触摸进度条
        progressContainer.addEventListener('touchstart', handleProgressTouch);
        
        // 退出全屏
        exitFullscreenBtn.addEventListener('click', exitMobileFullscreen);
        
        // 更新进度
        setInterval(updateMobileProgress, 200);
    }

    // 处理进度条触摸
    function handleProgressTouch(e) {
        e.preventDefault();
        if (!currentVideo) return;
        
        const progressContainer = document.getElementById('mobileProgressContainer');
        const progressBar = document.getElementById('mobileProgressBar');
        const handle = document.getElementById('progressHandle');
        
        const touch = e.touches[0];
        const rect = progressContainer.getBoundingClientRect();
        let percent = (touch.clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        
        currentVideo.currentTime = percent * currentVideo.duration;
        progressBar.style.width = (percent * 100) + '%';
        handle.style.display = 'block';
        handle.style.left = (percent * 100) + '%';
        
        const moveHandler = (moveEvent) => {
            const moveTouch = moveEvent.touches[0];
            let movePercent = (moveTouch.clientX - rect.left) / rect.width;
            movePercent = Math.max(0, Math.min(1, movePercent));
            
            currentVideo.currentTime = movePercent * currentVideo.duration;
            progressBar.style.width = (movePercent * 100) + '%';
            handle.style.left = (movePercent * 100) + '%';
        };
        
        const endHandler = () => {
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', endHandler);
            setTimeout(() => {
                handle.style.display = 'none';
            }, 1000);
        };
        
        document.addEventListener('touchmove', moveHandler);
        document.addEventListener('touchend', endHandler);
    }

    // 更新移动端进度条
    function updateMobileProgress() {
        if (currentVideo && isFullscreen) {
            const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
            document.getElementById('mobileProgressBar').style.width = progress + '%';
        }
    }

    // 显示底部菜单
    function showBottomMenu() {
        const menu = document.getElementById('mobileBottomMenu');
        const overlay = document.getElementById('overlay');
        const exitBtn = document.getElementById('mobileExitBtn');
        
        exitBtn.style.display = isFullscreen ? 'block' : 'none';
        menu.classList.add('show');
        overlay.classList.add('show');
        isMenuShowing = true;
    }

    // 隐藏底部菜单
    function hideBottomMenu() {
        const menu = document.getElementById('mobileBottomMenu');
        const overlay = document.getElementById('overlay');
        
        menu.classList.remove('show');
        overlay.classList.remove('show');
        isMenuShowing = false;
    }

    // 隐藏所有面板
    function hideAllPanels() {
        hideBottomMenu();
        document.getElementById('playbackRatePanel').classList.remove('show');
        document.getElementById('videoSizePanel').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    // 显示倍速面板
    function showPlaybackRatePanel() {
        document.getElementById('playbackRatePanel').classList.add('show');
    }

    // 显示尺寸面板
    function showVideoSizePanel() {
        document.getElementById('videoSizePanel').classList.add('show');
    }

    // 切换移动端全屏
    function toggleMobileFullscreen() {
        if (!isFullscreen) {
            enterMobileFullscreen();
        } else {
            exitMobileFullscreen();
        }
        hideBottomMenu();
    }

    // 进入移动端全屏
    function enterMobileFullscreen() {
        if (!currentVideo) return;
        
        // 保存原始样式
        originalStyles = {
            position: currentVideo.style.position,
            width: currentVideo.style.width,
            height: currentVideo.style.height,
            top: currentVideo.style.top,
            left: currentVideo.style.left,
            zIndex: currentVideo.style.zIndex,
            objectFit: currentVideo.style.objectFit
        };
        
        // 设置全屏样式
        currentVideo.style.position = 'fixed';
        currentVideo.style.width = '100vw';
        currentVideo.style.height = '100vh';
        currentVideo.style.top = '0';
        currentVideo.style.left = '0';
        currentVideo.style.zIndex = '9998';
        currentVideo.style.objectFit = 'contain';
        
        // 显示控制栏，隐藏悬浮按钮
        document.getElementById('mobileFullscreenControls').style.display = 'flex';
        document.getElementById('mobileVideoAssistant').style.display = 'none';
        
        isFullscreen = true;
        
        // 自动横屏（如果视频是横向的）
        if (currentVideo.videoWidth > currentVideo.videoHeight) {
            try {
                screen.orientation.lock('landscape');
            } catch (e) {
                console.log('横屏锁定不支持');
            }
        }
    }

    // 退出移动端全屏
    function exitMobileFullscreen() {
        if (!currentVideo) return;
        
        // 恢复原始样式
        Object.keys(originalStyles).forEach(prop => {
            currentVideo.style[prop] = originalStyles[prop];
        });
        
        // 隐藏控制栏
        document.getElementById('mobileFullscreenControls').style.display = 'none';
        
        // 解锁屏幕方向
        try {
            screen.orientation.unlock();
        } catch (e) {
            console.log('屏幕方向解锁失败');
        }
        
        isFullscreen = false;
        hideAllPanels();
    }

    // 设置播放倍速
    function setPlaybackRate(rate) {
        if (currentVideo) {
            currentVideo.playbackRate = rate;
        }
    }

    // 设置视频尺寸
    function setVideoSize(size) {
        if (currentVideo) {
            switch (size) {
                case '填充':
                    currentVideo.style.objectFit = 'cover';
                    break;
                case '拉伸':
                    currentVideo.style.objectFit = 'fill';
                    break;
                case '适应':
                    currentVideo.style.objectFit = 'contain';
                    break;
                case '原始':
                    currentVideo.style.objectFit = 'none';
                    break;
            }
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
        createMobileFloatingButton();
        
        // 初始检测视频
        detectVideo();
        
        // 定时检测新视频
        setInterval(detectVideo, 3000);
        
        // 监听页面变化
        const observer = new MutationObserver(detectVideo);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 点击空白处隐藏菜单
        document.addEventListener('touchstart', (e) => {
            if (isMenuShowing && !e.target.closest('.mobile-bottom-menu') && 
                !e.target.closest('.mobile-video-assistant')) {
                hideAllPanels();
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
