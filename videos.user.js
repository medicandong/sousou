// ==UserScript==
// @name         手机Edge视频全屏助手-沉浸式
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  解决状态栏显示问题，实现真正的沉浸式全屏
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: ['填充', '拉伸', '适应', '原始']
    };

    let currentVideo = null;
    let isFullscreen = false;
    let currentPlaybackRate = 1.0;
    let currentVideoSize = '适应';
    let originalVideoStyle = {};

    // 创建UI界面
    function createAssistantUI() {
        const uiHTML = `
            <style>
                .mobile-video-assistant {
                    position: fixed;
                    right: 20px;
                    bottom: 100px;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border-radius: 50%;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 2147483647;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 2px solid rgba(255,255,255,0.8);
                    touch-action: manipulation;
                }
                
                .mobile-video-assistant:active {
                    transform: scale(0.95);
                }
                
                .mobile-video-assistant::before {
                    content: '';
                    width: 24px;
                    height: 24px;
                    background: white;
                    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'/%3E%3C/svg%3E");
                    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'/%3E%3C/svg%3E");
                }

                .assistant-panel {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(20px);
                    border-radius: 16px 16px 0 0;
                    padding: 20px;
                    z-index: 2147483646;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                }
                
                .assistant-panel.show {
                    transform: translateY(0);
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    color: white;
                    font-size: 18px;
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
                
                .panel-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                
                .panel-item {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 18px;
                    text-align: center;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.2s ease;
                }
                
                .panel-item:active {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .fullscreen-controls {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.9));
                    padding: 15px 20px;
                    display: none;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 2147483645;
                    color: white;
                }
                
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .control-item {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    min-width: 50px;
                    text-align: center;
                    cursor: pointer;
                }
                
                .progress-container {
                    flex: 1;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    margin: 0 15px;
                    position: relative;
                }
                
                .progress-bar {
                    height: 100%;
                    background: #4ecdc4;
                    border-radius: 2px;
                    width: 0%;
                }
                
                .options-modal {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.95);
                    border-radius: 16px 16px 0 0;
                    padding: 20px;
                    z-index: 2147483644;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                }
                
                .options-modal.show {
                    transform: translateY(0);
                }
                
                .options-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-top: 20px;
                }
                
                .option-item {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 15px 8px;
                    text-align: center;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .option-item.active {
                    background: #4ecdc4;
                    color: black;
                    font-weight: bold;
                }
                
                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 2147483643;
                    display: none;
                }
                
                .overlay.show {
                    display: block;
                }

                /* 沉浸式全屏样式 */
                .immersive-fullscreen {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483640 !important;
                    background: black !important;
                    object-fit: contain !important;
                }
                
                /* 隐藏页面其他元素 */
                body.immersive-mode {
                    overflow: hidden !important;
                    position: fixed !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                
                body.immersive-mode *:not(.immersive-fullscreen):not(.fullscreen-controls) {
                    visibility: hidden !important;
                }
                
                /* 针对移动端状态栏的额外处理 */
                @media (orientation: landscape) {
                    .immersive-fullscreen {
                        width: 100vh !important;
                        height: 100vw !important;
                        top: 0 !important;
                        left: 0 !important;
                        transform: rotate(90deg) translate(0, -100%) !important;
                        transform-origin: 0 0 !important;
                    }
                }
            </style>
            
            <div class="mobile-video-assistant" id="videoAssistantBtn"></div>
            
            <div class="assistant-panel" id="assistantPanel">
                <div class="panel-header">
                    <span>视频设置</span>
                    <div class="close-btn" id="panelCloseBtn"></div>
                </div>
                <div class="panel-grid">
                    <div class="panel-item" id="fullscreenBtn">沉浸全屏</div>
                    <div class="panel-item" id="playbackRateBtn">播放倍速</div>
                    <div class="panel-item" id="videoSizeBtn">画面尺寸</div>
                </div>
            </div>
            
            <div class="fullscreen-controls" id="fullscreenControls">
                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="control-group">
                    <div class="control-item" id="rateDisplay">1.0</div>
                    <div class="control-item" id="sizeDisplay">适应</div>
                    <div class="control-item" id="exitBtn">退出</div>
                </div>
            </div>
            
            <div class="options-modal" id="playbackRateModal">
                <div class="panel-header">
                    <span>选择播放速度</span>
                    <div class="close-btn" id="closeRateModal"></div>
                </div>
                <div class="options-grid" id="playbackRateOptions"></div>
            </div>
            
            <div class="options-modal" id="videoSizeModal">
                <div class="panel-header">
                    <span>选择画面尺寸</span>
                    <div class="close-btn" id="closeSizeModal"></div>
                </div>
                <div class="options-grid" id="videoSizeOptions"></div>
            </div>
            
            <div class="overlay" id="overlay"></div>
        `;

        const container = document.createElement('div');
        container.innerHTML = uiHTML;
        document.body.appendChild(container);
        
        setupEventListeners();
        initOptions();
    }

    // 设置视口meta标签以支持全屏
    function setupViewportMeta() {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            document.head.appendChild(meta);
        }
        // 添加全屏相关属性
        meta.content = meta.content + ', viewport-fit=cover';
    }

    // 沉浸式全屏实现
    async function enterImmersiveFullscreen() {
        if (!currentVideo) return;
        
        try {
            console.log('进入沉浸式全屏模式');
            
            // 保存原始样式
            originalVideoStyle = {
                position: currentVideo.style.position,
                width: currentVideo.style.width,
                height: currentVideo.style.height,
                top: currentVideo.style.top,
                left: currentVideo.style.left,
                zIndex: currentVideo.style.zIndex,
                objectFit: currentVideo.style.objectFit,
                parent: currentVideo.parentElement
            };
            
            // 创建全屏容器
            const fullscreenContainer = document.createElement('div');
            fullscreenContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: black;
                z-index: 2147483640;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // 将视频移动到全屏容器
            if (currentVideo.parentElement) {
                currentVideo.parentElement.removeChild(currentVideo);
            }
            fullscreenContainer.appendChild(currentVideo);
            document.body.appendChild(fullscreenContainer);
            
            // 应用沉浸式样式
            currentVideo.classList.add('immersive-fullscreen');
            Object.assign(currentVideo.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: '2147483641',
                backgroundColor: '#000',
                objectFit: getObjectFitValue(currentVideoSize)
            });
            
            // 设置页面为沉浸模式
            document.body.classList.add('immersive-mode');
            
            // 隐藏系统UI的尝试
            hideSystemUI();
            
            // 显示控制栏
            document.getElementById('fullscreenControls').style.display = 'flex';
            document.getElementById('videoAssistantBtn').style.display = 'none';
            
            isFullscreen = true;
            
            // 智能横屏处理
            if (shouldUseLandscape(currentVideo)) {
                await lockLandscape();
            }
            
            // 拦截手势
            preventSwipeBack(true);
            
            // 开始更新进度
            updateProgress();
            
        } catch (error) {
            console.error('进入沉浸式全屏失败:', error);
            exitImmersiveFullscreen();
        }
    }

    // 隐藏系统UI的多种尝试
    function hideSystemUI() {
        // 方法1: 尝试使用全屏API（即使可能不完美）
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } catch (e) {}
        
        // 方法2: 设置页面样式隐藏滚动条等
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        // 方法3: 尝试设置视口高度为屏幕高度
        const setViewportHeight = () => {
            document.documentElement.style.height = '100%';
            document.body.style.height = '100%';
        };
        setViewportHeight();
        
        // 方法4: 在横屏时额外处理
        if (window.innerHeight < window.innerWidth) {
            document.documentElement.style.transform = 'scale(1)';
        }
    }

    // 退出沉浸式全屏
    function exitImmersiveFullscreen() {
        if (!currentVideo) return;
        
        console.log('退出沉浸式全屏');
        
        // 恢复手势
        preventSwipeBack(false);
        
        // 移除沉浸模式
        document.body.classList.remove('immersive-mode');
        
        // 恢复页面样式
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        
        // 移除全屏容器
        const fullscreenContainer = currentVideo.parentElement;
        if (fullscreenContainer && fullscreenContainer !== document.body) {
            if (originalVideoStyle.parent) {
                originalVideoStyle.parent.appendChild(currentVideo);
            } else {
                document.body.appendChild(currentVideo);
            }
            fullscreenContainer.remove();
        }
        
        // 恢复视频原始样式
        currentVideo.classList.remove('immersive-fullscreen');
        Object.keys(originalVideoStyle).forEach(prop => {
            if (prop !== 'parent' && originalVideoStyle[prop] !== undefined) {
                currentVideo.style[prop] = originalVideoStyle[prop];
            }
        });
        
        // 退出系统全屏
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        } catch (e) {}
        
        // 解锁屏幕方向
        unlockScreenOrientation();
        
        // 隐藏控制栏
        document.getElementById('fullscreenControls').style.display = 'none';
        document.getElementById('videoAssistantBtn').style.display = 'flex';
        
        isFullscreen = false;
    }

    // 锁定横屏
    async function lockLandscape() {
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
                console.log('横屏锁定成功');
            } catch (e) {
                console.log('横屏锁定失败，使用CSS横屏:', e);
                // 备用方案：使用CSS横屏
                applyCSSLandscape();
            }
        } else {
            applyCSSLandscape();
        }
    }

    // CSS横屏备用方案
    function applyCSSLandscape() {
        const video = currentVideo;
        if (!video) return;
        
        video.style.transform = 'rotate(90deg)';
        video.style.transformOrigin = 'center center';
        video.style.width = '100vh';
        video.style.height = '100vw';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.transform = 'translate(-50%, -50%) rotate(90deg)';
    }

    // 解锁屏幕方向
    function unlockScreenOrientation() {
        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock();
            } catch (e) {
                console.log('屏幕方向解锁失败:', e);
            }
        }
    }

    // 拦截手势（简化版）
    function preventSwipeBack(enable) {
        if (!currentVideo) return;
        
        const handler = enable ? 
            (e) => { if (e.touches[0].clientX < 50) e.preventDefault(); } : 
            null;
            
        if (enable) {
            document.addEventListener('touchstart', handler, { passive: false });
            document.addEventListener('touchmove', handler, { passive: false });
        } else {
            document.removeEventListener('touchstart', handler);
            document.removeEventListener('touchmove', handler);
        }
    }

    // 其他辅助函数保持不变
    function shouldUseLandscape(video) {
        if (!video.videoWidth || !video.videoHeight) return true;
        return video.videoWidth / video.videoHeight > 1.2;
    }

    function getObjectFitValue(size) {
        switch (size) {
            case '填充': return 'cover';
            case '拉伸': return 'fill';
            case '适应': return 'contain';
            case '原始': return 'none';
            default: return 'contain';
        }
    }

    // 事件监听和其他函数保持不变（与之前版本相同）
    function setupEventListeners() {
        document.getElementById('videoAssistantBtn').addEventListener('click', showAssistantPanel);
        document.getElementById('panelCloseBtn').addEventListener('click', hideAllModals);
        document.getElementById('overlay').addEventListener('click', hideAllModals);
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            enterImmersiveFullscreen();
            hideAllModals();
        });
        document.getElementById('playbackRateBtn').addEventListener('click', showPlaybackRateModal);
        document.getElementById('videoSizeBtn').addEventListener('click', showVideoSizeModal);
        document.getElementById('exitBtn').addEventListener('click', exitImmersiveFullscreen);
        document.getElementById('rateDisplay').addEventListener('click', showPlaybackRateModal);
        document.getElementById('sizeDisplay').addEventListener('click', showVideoSizeModal);
        document.getElementById('progressContainer').addEventListener('click', handleProgressClick);
        document.getElementById('closeRateModal').addEventListener('click', hideAllModals);
        document.getElementById('closeSizeModal').addEventListener('click', hideAllModals);
    }

    // 初始化选项和其他函数保持不变...
    function initOptions() {
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
                document.getElementById('rateDisplay').textContent = rate.toFixed(2);
                rateOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                hideAllModals();
            });
        });
        
        sizeOptions.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const size = item.getAttribute('data-size');
                setVideoSize(size);
                document.getElementById('sizeDisplay').textContent = size;
                sizeOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                hideAllModals();
            });
        });
    }

    function showAssistantPanel() {
        document.getElementById('assistantPanel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function hideAllModals() {
        document.getElementById('assistantPanel').classList.remove('show');
        document.getElementById('playbackRateModal').classList.remove('show');
        document.getElementById('videoSizeModal').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    function showPlaybackRateModal() {
        document.getElementById('playbackRateModal').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function showVideoSizeModal() {
        document.getElementById('videoSizeModal').classList.add('show');
        document.getElementById('overlay').classList.add('show');
    }

    function handleProgressClick(e) {
        if (currentVideo && isFullscreen) {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            currentVideo.currentTime = percent * currentVideo.duration;
        }
    }

    function setPlaybackRate(rate) {
        if (currentVideo) {
            currentVideo.playbackRate = rate;
            currentPlaybackRate = rate;
        }
    }

    function setVideoSize(size) {
        if (currentVideo) {
            currentVideo.style.objectFit = getObjectFitValue(size);
            currentVideoSize = size;
        }
    }

    function updateProgress() {
        if (currentVideo && isFullscreen) {
            const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
            requestAnimationFrame(updateProgress);
        }
    }

    function detectVideo() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.hasAttribute('data-video-assistant')) {
                video.setAttribute('data-video-assistant', 'true');
                video.addEventListener('play', () => {
                    currentVideo = video;
                    document.getElementById('videoAssistantBtn').style.display = 'flex';
                });
                video.addEventListener('pause', () => {
                    if (!isFullscreen) document.getElementById('videoAssistantBtn').style.display = 'none';
                });
                video.addEventListener('ended', () => {
                    document.getElementById('videoAssistantBtn').style.display = 'none';
                    if (isFullscreen) exitImmersiveFullscreen();
                });
            }
        });
    }

    function init() {
        setupViewportMeta();
        createAssistantUI();
        detectVideo();
        setInterval(detectVideo, 2000);
        const observer = new MutationObserver(detectVideo);
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('沉浸式全屏助手已加载');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
})();
