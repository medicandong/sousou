// ==UserScript==
// @name         手机Edge视频播放助手-修复版
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  手机Edge浏览器网页视频播放助手，修复横屏和全屏控制问题
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置项
    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: ['填充', '拉伸', '适应', '原始']
    };

    let currentVideo = null;
    let isFullscreen = false;
    let originalStyles = {};
    let isMenuShowing = false;
    let currentPlaybackRate = 1.0;
    let currentVideoSize = '适应';

    // 创建移动端优化的悬浮按钮
    function createMobileFloatingButton() {
        const button = document.createElement('div');
        button.innerHTML = `
            <style>
                /* 移动端悬浮按钮 */
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
                    user-select: none;
                }
                
                .mobile-video-assistant::before {
                    content: '';
                    width: 24px;
                    height: 24px;
                    background: white;
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E");
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
                
                /* 全屏控制栏 */
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
                    font-size: 14px;
                    cursor: pointer;
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

                /* 全屏视频样式 */
                .video-fullscreen {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 9998 !important;
                    background: black !important;
                    object-fit: contain !important;
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
                </div>
            </div>
            
            <!-- 全屏控制栏 -->
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
        setupEventListeners();
    }

    // 设置事件监听
    function setupEventListeners() {
        const assistant = document.getElementById('mobileVideoAssistant');
        const bottomMenu = document.getElementById('mobileBottomMenu');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const fullscreenBtn = document.getElementById('mobileFullscreenBtn');
        const playbackRateBtn = document.getElementById('playbackRateBtn');
        const videoSizeBtn = document.getElementById('videoSizeBtn');
        const overlay = document.getElementById('overlay');
        
        // 悬浮按钮点击
        assistant.addEventListener('click', showBottomMenu);
        
        // 关闭菜单
        closeMenuBtn.addEventListener('click', hideBottomMenu);
        
        // 遮罩层点击关闭
        overlay.addEventListener('click', hideAllPanels);
        
        // 菜单项点击
        fullscreenBtn.addEventListener('click', toggleMobileFullscreen);
        playbackRateBtn.addEventListener('click', showPlaybackRatePanel);
        videoSizeBtn.addEventListener('click', showVideoSizePanel);
        
        // 全屏控制栏事件
        document.getElementById('mobileExitFullscreen').addEventListener('click', exitMobileFullscreen);
        document.getElementById('mobileRateDisplay').addEventListener('click', showPlaybackRatePanel);
        document.getElementById('mobileSizeDisplay').addEventListener('click', showVideoSizePanel);
        
        // 进度条点击
        document.getElementById('mobileProgressContainer').addEventListener('click', (e) => {
            if (currentVideo && isFullscreen) {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                currentVideo.currentTime = percent * currentVideo.duration;
            }
        });
        
        // 初始化选项面板
        initOptionsPanels();
    }

    // 初始化选项面板
    function initOptionsPanels() {
        // 初始化倍速选项
        const rateOptions = document.getElementById('playbackRateOptions');
        rateOptions.innerHTML = CONFIG.playbackRates.map(rate => `
            <div class="option-item ${rate === 1.0 ? 'active' : ''}" data-rate="${rate}">${rate}x</div>
        `).join('');
        
        // 初始化尺寸选项
        const sizeOptions = document.getElementById('videoSizeOptions');
        sizeOptions.innerHTML = CONFIG.videoSizes.map(size => `
            <div class="option-item ${size === '适应' ? 'active' : ''}" data-size="${size}">${size}</div>
        `).join('');
        
        // 倍速选项事件
        rateOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const rate = parseFloat(item.getAttribute('data-rate'));
                setPlaybackRate(rate);
                currentPlaybackRate = rate;
                document.getElementById('mobileRateDisplay').textContent = rate.toFixed(2);
                
                // 更新激活状态
                rateOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                hideAllPanels();
            });
        });
        
        // 尺寸选项事件
        sizeOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const size = item.getAttribute('data-size');
                setVideoSize(size);
                currentVideoSize = size;
                document.getElementById('mobileSizeDisplay').textContent = size;
                
                // 更新激活状态
                sizeOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                hideAllPanels();
            });
        });
        
        // 关闭按钮事件
        document.getElementById('closeRatePanel').addEventListener('click', hideAllPanels);
        document.getElementById('closeSizePanel').addEventListener('click', hideAllPanels);
    }

    // 显示底部菜单
    function showBottomMenu() {
        const menu = document.getElementById('mobileBottomMenu');
        const overlay = document.getElementById('overlay');
        
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
        document.getElementById('overlay').classList.add('show');
    }

    // 显示尺寸面板
    function showVideoSizePanel() {
        document.getElementById('videoSizePanel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    // 切换移动端全屏
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
        
        // 如果视频是横向的（宽高比 > 1.2），使用横屏
        if (aspectRatio > 1.2) {
            return true;
        }
        
        // 如果视频是纵向的（宽高比 < 0.8），使用竖屏
        if (aspectRatio < 0.8) {
            return false;
        }
        
        // 接近正方形的视频，根据当前屏幕方向决定
        return window.innerWidth > window.innerHeight;
    }

    // 进入移动端全屏
    function enterMobileFullscreen() {
        if (!currentVideo) return;
        
        console.log('进入全屏模式');
        
        // 保存原始样式
        originalStyles = {
            position: currentVideo.style.position,
            width: currentVideo.style.width,
            height: currentVideo.style.height,
            top: currentVideo.style.top,
            left: currentVideo.style.left,
            zIndex: currentVideo.style.zIndex,
            objectFit: currentVideo.style.objectFit,
            backgroundColor: currentVideo.style.backgroundColor
        };
        
        // 添加全屏类
        currentVideo.classList.add('video-fullscreen');
        
        // 设置全屏样式
        Object.assign(currentVideo.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '9998',
            backgroundColor: '#000',
            objectFit: currentVideoSize === '填充' ? 'cover' : 
                      currentVideoSize === '拉伸' ? 'fill' :
                      currentVideoSize === '适应' ? 'contain' : 'none'
        });
        
        // 显示控制栏，隐藏悬浮按钮
        document.getElementById('mobileFullscreenControls').style.display = 'flex';
        document.getElementById('mobileVideoAssistant').style.display = 'none';
        
        isFullscreen = true;
        
        // 智能横竖屏处理
        if (shouldUseLandscape(currentVideo)) {
            console.log('视频为横向，尝试横屏显示');
            try {
                // 尝试横屏锁定
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(e => {
                        console.log('横屏锁定失败，使用CSS横屏:', e);
                        forceLandscapeWithCSS();
                    });
                } else {
                    forceLandscapeWithCSS();
                }
            } catch (e) {
                console.log('横屏处理失败:', e);
                forceLandscapeWithCSS();
            }
        } else {
            console.log('视频为纵向，保持竖屏显示');
        }
        
        // 开始更新进度
        updateProgress();
    }

    // 使用CSS强制横屏
    function forceLandscapeWithCSS() {
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vh;
            height: 100vw;
            transform: rotate(90deg) translate(0, -100%);
            transform-origin: 0 0;
            z-index: 9997;
            background: black;
        `;
        
        document.body.appendChild(videoContainer);
        videoContainer.appendChild(currentVideo);
        
        // 保存容器引用以便退出时恢复
        currentVideo._fullscreenContainer = videoContainer;
    }

    // 退出移动端全屏
    function exitMobileFullscreen() {
        if (!currentVideo) return;
        
        console.log('退出全屏模式');
        
        // 移除全屏类
        currentVideo.classList.remove('video-fullscreen');
        
        // 恢复原始样式
        Object.keys(originalStyles).forEach(prop => {
            currentVideo.style[prop] = originalStyles[prop];
        });
        
        // 如果使用了CSS横屏，恢复DOM结构
        if (currentVideo._fullscreenContainer) {
            document.body.appendChild(currentVideo);
            currentVideo._fullscreenContainer.remove();
            delete currentVideo._fullscreenContainer;
        }
        
        // 隐藏控制栏，显示悬浮按钮
        document.getElementById('mobileFullscreenControls').style.display = 'none';
        document.getElementById('mobileVideoAssistant').style.display = 'flex';
        
        // 解锁屏幕方向
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) {
            console.log('屏幕方向解锁失败:', e);
        }
        
        isFullscreen = false;
        hideAllPanels();
    }

    // 设置播放倍速
    function setPlaybackRate(rate) {
        if (currentVideo) {
            currentVideo.playbackRate = rate;
            console.log('设置播放倍速:', rate);
        }
    }

    // 设置视频尺寸
    function setVideoSize(size) {
        if (currentVideo && isFullscreen) {
            let objectFitValue;
            switch (size) {
                case '填充':
                    objectFitValue = 'cover';
                    break;
                case '拉伸':
                    objectFitValue = 'fill';
                    break;
                case '适应':
                    objectFitValue = 'contain';
                    break;
                case '原始':
                    objectFitValue = 'none';
                    break;
            }
            currentVideo.style.objectFit = objectFitValue;
            console.log('设置画面尺寸:', size, objectFitValue);
        }
    }

    // 更新进度条
    function updateProgress() {
        if (currentVideo && isFullscreen) {
            const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
            document.getElementById('mobileProgressBar').style.width = progress + '%';
            
            // 继续更新
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
                    console.log('检测到视频播放:', video);
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
        // 等待页面加载完成
        setTimeout(() => {
            createMobileFloatingButton();
            detectVideo();
            
            // 定时检测新视频
            setInterval(detectVideo, 2000);
            
            // 监听页面变化
            const observer = new MutationObserver(detectVideo);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('手机Edge视频播放助手已加载');
        }, 1000);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
