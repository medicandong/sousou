// ==UserScript==
// @name         手机Edge视频全屏助手-完整版
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  完整的手机Edge视频全屏助手，解决状态栏和手势问题
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: ['填充', '拉伸', '适应', '原始']
    };

    let currentVideo = null;
    let isFullscreen = false;
    let currentPlaybackRate = 1.0;
    let currentVideoSize = '适应';
    let startX = 0;
    let startY = 0;

    // 全屏API兼容性处理
    const fullscreenAPI = {
        request: function(element) {
            if (element.requestFullscreen) return element.requestFullscreen();
            if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
            if (element.mozRequestFullScreen) return element.mozRequestFullScreen();
            if (element.msRequestFullscreen) return element.msRequestFullscreen();
            return Promise.reject(new Error('全屏API不支持'));
        },
        exit: function() {
            if (document.exitFullscreen) return document.exitFullscreen();
            if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
            if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
            if (document.msExitFullscreen) return document.msExitFullscreen();
            return Promise.reject(new Error('退出全屏API不支持'));
        },
        get isSupported() {
            return !!(document.fullscreenEnabled || 
                     document.webkitFullscreenEnabled || 
                     document.mozFullScreenEnabled || 
                     document.msFullscreenEnabled);
        }
    };

    // 屏幕方向API
    const orientationAPI = {
        lock: function(orientation) {
            if (screen.orientation && screen.orientation.lock) {
                return screen.orientation.lock(orientation);
            }
            return Promise.reject(new Error('屏幕方向锁定不支持'));
        },
        unlock: function() {
            if (screen.orientation && screen.orientation.unlock) {
                return screen.orientation.unlock();
            }
            return Promise.reject(new Error('屏幕方向解锁不支持'));
        },
        get isSupported() {
            return !!(screen.orientation && screen.orientation.lock);
        }
    };

    // 创建完整的UI界面
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
                    z-index: 10000;
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
                    z-index: 10001;
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
                    z-index: 10002;
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
                    z-index: 10003;
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
                    z-index: 9999;
                    display: none;
                }
                
                .overlay.show {
                    display: block;
                }

                /* 全屏样式 */
                .video-fullscreen {
                    object-fit: contain !important;
                }
            </style>
            
            <!-- 悬浮按钮 -->
            <div class="mobile-video-assistant" id="videoAssistantBtn"></div>
            
            <!-- 主面板 -->
            <div class="assistant-panel" id="assistantPanel">
                <div class="panel-header">
                    <span>视频设置</span>
                    <div class="close-btn" id="panelCloseBtn"></div>
                </div>
                <div class="panel-grid">
                    <div class="panel-item" id="fullscreenBtn">全屏播放</div>
                    <div class="panel-item" id="playbackRateBtn">播放倍速</div>
                    <div class="panel-item" id="videoSizeBtn">画面尺寸</div>
                </div>
            </div>
            
            <!-- 全屏控制栏 -->
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
            
            <!-- 倍速选择模态框 -->
            <div class="options-modal" id="playbackRateModal">
                <div class="panel-header">
                    <span>选择播放速度</span>
                    <div class="close-btn" id="closeRateModal"></div>
                </div>
                <div class="options-grid" id="playbackRateOptions"></div>
            </div>
            
            <!-- 尺寸选择模态框 -->
            <div class="options-modal" id="videoSizeModal">
                <div class="panel-header">
                    <span>选择画面尺寸</span>
                    <div class="close-btn" id="closeSizeModal"></div>
                </div>
                <div class="options-grid" id="videoSizeOptions"></div>
            </div>
            
            <!-- 遮罩层 -->
            <div class="overlay" id="overlay"></div>
        `;

        const container = document.createElement('div');
        container.innerHTML = uiHTML;
        document.body.appendChild(container);
        
        setupEventListeners();
        initOptions();
    }

    function setupEventListeners() {
        // 悬浮按钮
        document.getElementById('videoAssistantBtn').addEventListener('click', showAssistantPanel);
        
        // 面板关闭
        document.getElementById('panelCloseBtn').addEventListener('click', hideAllModals);
        document.getElementById('overlay').addEventListener('click', hideAllModals);
        
        // 功能按钮
        document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
        document.getElementById('playbackRateBtn').addEventListener('click', showPlaybackRateModal);
        document.getElementById('videoSizeBtn').addEventListener('click', showVideoSizeModal);
        
        // 全屏控制栏
        document.getElementById('exitBtn').addEventListener('click', exitFullscreen);
        document.getElementById('rateDisplay').addEventListener('click', showPlaybackRateModal);
        document.getElementById('sizeDisplay').addEventListener('click', showVideoSizeModal);
        
        // 进度条
        document.getElementById('progressContainer').addEventListener('click', handleProgressClick);
        
        // 模态框关闭
        document.getElementById('closeRateModal').addEventListener('click', hideAllModals);
        document.getElementById('closeSizeModal').addEventListener('click', hideAllModals);
        
        // 全屏事件监听
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }

    function initOptions() {
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
                document.getElementById('rateDisplay').textContent = rate.toFixed(2);
                rateOptions.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                hideAllModals();
            });
        });
        
        // 尺寸选项事件
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

    // 智能判断横竖屏
    function shouldUseLandscape(video) {
        if (!video.videoWidth || !video.videoHeight) return true;
        const aspectRatio = video.videoWidth / video.videoHeight;
        return aspectRatio > 1.2;
    }

    async function toggleFullscreen() {
        if (!currentVideo) return;
        
        if (!isFullscreen) {
            await enterFullscreen();
        }
        hideAllModals();
    }

    async function enterFullscreen() {
        if (!currentVideo) return;
        
        try {
            // 添加全屏样式
            currentVideo.classList.add('video-fullscreen');
            
            // 请求全屏
            await fullscreenAPI.request(currentVideo);
            
            // 智能横屏
            if (shouldUseLandscape(currentVideo) && orientationAPI.isSupported) {
                try {
                    await orientationAPI.lock('landscape');
                } catch (e) {
                    console.log('横屏锁定失败:', e);
                }
            }
            
            // 显示控制栏，隐藏悬浮按钮
            document.getElementById('fullscreenControls').style.display = 'flex';
            document.getElementById('videoAssistantBtn').style.display = 'none';
            
            // 拦截手势
            preventSwipeBack(true);
            
            // 开始更新进度
            updateProgress();
            
        } catch (error) {
            console.error('进入全屏失败:', error);
            currentVideo.classList.remove('video-fullscreen');
        }
    }

    async function exitFullscreen() {
        try {
            // 恢复手势
            preventSwipeBack(false);
            
            // 退出全屏
            await fullscreenAPI.exit();
            
            // 解锁屏幕方向
            if (orientationAPI.isSupported) {
                try {
                    await orientationAPI.unlock();
                } catch (e) {
                    console.log('屏幕方向解锁失败:', e);
                }
            }
            
        } catch (error) {
            console.error('退出全屏失败:', error);
        }
    }

    function handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        
        isFullscreen = !!fullscreenElement;
        
        if (!isFullscreen) {
            // 全屏退出后的清理
            preventSwipeBack(false);
            document.getElementById('fullscreenControls').style.display = 'none';
            document.getElementById('videoAssistantBtn').style.display = 'flex';
            if (currentVideo) {
                currentVideo.classList.remove('video-fullscreen');
            }
        }
    }

    // 拦截滑动返回手势
    function preventSwipeBack(enable) {
        if (!currentVideo) return;
        
        if (enable) {
            currentVideo.addEventListener('touchstart', handleTouchStart, { passive: false });
            currentVideo.addEventListener('touchmove', handleTouchMove, { passive: false });
        } else {
            currentVideo.removeEventListener('touchstart', handleTouchStart);
            currentVideo.removeEventListener('touchmove', handleTouchMove);
        }
    }

    function handleTouchStart(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        if (!isFullscreen) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        // 如果主要是水平滑动，且在屏幕左边缘，则阻止事件
        if (Math.abs(deltaX) > Math.abs(deltaY) && startX < 50) {
            e.preventDefault();
            e.stopPropagation();
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
            let objectFitValue;
            switch (size) {
                case '填充': objectFitValue = 'cover'; break;
                case '拉伸': objectFitValue = 'fill'; break;
                case '适应': objectFitValue = 'contain'; break;
                case '原始': objectFitValue = 'none'; break;
                default: objectFitValue = 'contain';
            }
            currentVideo.style.objectFit = objectFitValue;
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

    // 视频检测
    function detectVideo() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            if (!video.hasAttribute('data-video-assistant')) {
                video.setAttribute('data-video-assistant', 'true');
                
                video.addEventListener('play', () => {
                    currentVideo = video;
                    document.getElementById('videoAssistantBtn').style.display = 'flex';
                    console.log('检测到视频播放，显示悬浮按钮');
                });
                
                video.addEventListener('pause', () => {
                    if (!isFullscreen) {
                        document.getElementById('videoAssistantBtn').style.display = 'none';
                    }
                });
                
                video.addEventListener('ended', () => {
                    document.getElementById('videoAssistantBtn').style.display = 'none';
                    if (isFullscreen) {
                        exitFullscreen();
                    }
                });
            }
        });
    }

    // 初始化
    function init() {
        console.log('开始初始化视频助手...');
        
        // 创建UI
        createAssistantUI();
        
        // 初始检测
        detectVideo();
        
        // 定时检测新视频
        setInterval(detectVideo, 2000);
        
        // 监听DOM变化
        const observer = new MutationObserver(detectVideo);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('手机Edge视频全屏助手已加载完成');
    }

    // 启动 - 使用更可靠的启动方式
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 如果文档已经加载完成，直接初始化
        setTimeout(init, 1000);
    }
})();
