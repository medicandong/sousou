// ==UserScript==
// @name         网页视频播放助手
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  手机浏览器视频播放助手，支持全屏、倍速、画面尺寸调节，优化YouTube兼容性
// @author       Video Assistant
// @match        *://*/*
// @match        *://*.youtube.com/*
// @match        *://*.youtu.be/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        speeds: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        sizes: [
            { name: '填充', value: 'fill' },
            { name: '拉伸', value: 'stretch' },
            { name: '适应', value: 'contain' },
            { name: '原始', value: 'none' }
        ]
    };

    // 全局变量
    let currentVideo = null;
    let floatingButton = null;
    let controlPanel = null;
    let isFullscreen = false;
    let originalVideoStyle = null;

    // 初始化
    function init() {
        console.log('视频播放助手初始化');
        
        // 监听页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupVideoListeners);
        } else {
            setupVideoListeners();
        }

        // 监听动态加载的视频
        observeVideoElements();
    }

    // 设置视频监听器
    function setupVideoListeners() {
        const videos = document.querySelectorAll('video');
        console.log(`找到 ${videos.length} 个视频元素`);

        videos.forEach(video => {
            if (!video.hasAttribute('data-video-assistant-bound')) {
                video.setAttribute('data-video-assistant-bound', 'true');
                
                video.addEventListener('play', () => {
                    console.log('视频开始播放');
                    currentVideo = video;
                    showFloatingButton();
                });

                video.addEventListener('pause', () => {
                    console.log('视频暂停');
                    hideFloatingButton();
                });

                video.addEventListener('ended', () => {
                    console.log('视频结束');
                    hideFloatingButton();
                });

                // 监听全屏变化
                video.addEventListener('fullscreenchange', handleFullscreenChange);
                video.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            }
        });
    }

    // 监听动态加载的视频元素
    function observeVideoElements() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'VIDEO') {
                            setupVideoListeners();
                        } else {
                            const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
                            if (videos.length > 0) {
                                setupVideoListeners();
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 显示悬浮按钮
    function showFloatingButton() {
        if (floatingButton) {
            floatingButton.style.display = 'block';
            return;
        }

        floatingButton = document.createElement('div');
        floatingButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="5" x2="12" y2="8"/>
                <line x1="12" y1="16" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="8" y2="12"/>
                <line x1="16" y1="12" x2="19" y2="12"/>
            </svg>
        `;

        floatingButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 44px;
            height: 44px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            color: white;
        `;

        floatingButton.addEventListener('click', showControlPanel);
        floatingButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showControlPanel();
        });

        document.body.appendChild(floatingButton);
    }

    // 隐藏悬浮按钮
    function hideFloatingButton() {
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        if (controlPanel) {
            controlPanel.style.display = 'none';
        }
    }

    // 显示控制面板
    function showControlPanel() {
        if (!currentVideo) return;

        if (controlPanel) {
            controlPanel.style.display = 'block';
            return;
        }

        controlPanel = document.createElement('div');
        controlPanel.innerHTML = `
            <div class="control-panel-content">
                <div class="control-item" data-action="fullscreen">
                    <span>全屏播放</span>
                </div>
                <div class="control-item" data-action="speed">
                    <span>倍速选择</span>
                </div>
                <div class="control-item" data-action="size">
                    <span>画面比例</span>
                </div>
            </div>
        `;

        // 检测屏幕方向，调整面板位置
        const isPortrait = window.innerHeight > window.innerWidth;
        const panelPosition = isPortrait ? {
            bottom: '100px',
            right: '10px'
        } : {
            bottom: '130px',
            right: '20px'
        };

        controlPanel.style.cssText = `
            position: fixed;
            bottom: ${panelPosition.bottom};
            right: ${panelPosition.right};
            background: rgba(0, 0, 0, 0.95);
            border-radius: 12px;
            padding: 8px 0;
            z-index: 10001;
            min-width: 140px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(20px);
            display: block;
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-height: ${isPortrait ? '200px' : 'auto'};
            overflow-y: ${isPortrait ? 'auto' : 'visible'};
        `;

        const content = controlPanel.querySelector('.control-panel-content');
        content.style.cssText = `
            color: white;
            font-size: 14px;
        `;

        const controlItems = controlPanel.querySelectorAll('.control-item');
        controlItems.forEach(item => {
            item.style.cssText = `
                padding: 14px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255, 255, 255, 0.15)';
                item.style.transform = 'translateX(2px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
                item.style.transform = 'translateX(0)';
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                handleControlAction(item.getAttribute('data-action'));
            });
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleControlAction(item.getAttribute('data-action'));
            });
        });

        // 移除最后一个项目的边框
        controlItems[controlItems.length - 1].style.borderBottom = 'none';

        document.body.appendChild(controlPanel);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', hideControlPanel, { once: true });
        }, 100);
    }

    // 隐藏控制面板
    function hideControlPanel() {
        if (controlPanel) {
            controlPanel.style.display = 'none';
        }
    }

    // 处理控制动作
    function handleControlAction(action) {
        switch (action) {
            case 'fullscreen':
                toggleFullscreen();
                break;
            case 'speed':
                showSpeedSelector();
                break;
            case 'size':
                showSizeSelector();
                break;
        }
        hideControlPanel();
    }

    // 切换全屏
    function toggleFullscreen() {
        if (!currentVideo) return;

        if (!isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }

    // 进入全屏
    function enterFullscreen() {
        if (!currentVideo) return;

        // 保存原始样式
        originalVideoStyle = {
            width: currentVideo.style.width,
            height: currentVideo.style.height,
            objectFit: currentVideo.style.objectFit,
            position: currentVideo.style.position,
            top: currentVideo.style.top,
            left: currentVideo.style.left,
            zIndex: currentVideo.style.zIndex
        };

        // 尝试进入全屏
        if (currentVideo.requestFullscreen) {
            currentVideo.requestFullscreen();
        } else if (currentVideo.webkitRequestFullscreen) {
            currentVideo.webkitRequestFullscreen();
        } else if (currentVideo.mozRequestFullScreen) {
            currentVideo.mozRequestFullScreen();
        } else if (currentVideo.msRequestFullscreen) {
            currentVideo.msRequestFullscreen();
        }

        // 设置全屏样式
        currentVideo.style.width = '100vw';
        currentVideo.style.height = '100vh';
        currentVideo.style.objectFit = 'contain';
        currentVideo.style.position = 'fixed';
        currentVideo.style.top = '0';
        currentVideo.style.left = '0';
        currentVideo.style.zIndex = '9999';

        // 尝试锁定横屏
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
                console.log('横屏锁定失败，使用默认全屏');
            });
        }

        isFullscreen = true;
        showFullscreenControls();
    }

    // 退出全屏
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        // 解锁屏幕方向
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }

        // 恢复原始样式
        if (originalVideoStyle && currentVideo) {
            currentVideo.style.width = originalVideoStyle.width;
            currentVideo.style.height = originalVideoStyle.height;
            currentVideo.style.objectFit = originalVideoStyle.objectFit;
            currentVideo.style.position = originalVideoStyle.position;
            currentVideo.style.top = originalVideoStyle.top;
            currentVideo.style.left = originalVideoStyle.left;
            currentVideo.style.zIndex = originalVideoStyle.zIndex;
        }

        isFullscreen = false;
        hideFullscreenControls();
    }

    // 处理全屏变化
    function handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                       document.webkitFullscreenElement || 
                                       document.mozFullScreenElement || 
                                       document.msFullscreenElement);

        if (!isCurrentlyFullscreen && isFullscreen) {
            // 用户通过其他方式退出全屏
            exitFullscreen();
        }
    }

    // 显示全屏控制栏
    function showFullscreenControls() {
        if (!currentVideo) return;

        let controls = document.getElementById('video-fullscreen-controls');
        if (controls) {
            controls.style.display = 'flex';
            return;
        }

        controls = document.createElement('div');
        controls.id = 'video-fullscreen-controls';
        controls.innerHTML = `
            <div class="controls-container">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
                <div class="controls-row">
                    <div class="control-button" id="speed-control">
                        <span>1.0</span>
                    </div>
                    <div class="control-button" id="size-control">
                        <span>原始</span>
                    </div>
                    <div class="control-button" id="exit-fullscreen">
                        <span>退出</span>
                    </div>
                </div>
            </div>
        `;

        controls.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
            padding: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        const container = controls.querySelector('.controls-container');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
        `;

        // 进度条样式
        const progressContainer = controls.querySelector('.progress-container');
        progressContainer.style.cssText = `
            width: 100%;
        `;

        const progressBar = controls.querySelector('.progress-bar');
        progressBar.style.cssText = `
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            overflow: hidden;
        `;

        const progressFill = controls.querySelector('.progress-fill');
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: #ff4444;
            transition: width 0.1s;
        `;

        // 控制按钮行样式
        const controlsRow = controls.querySelector('.controls-row');
        controlsRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        `;

        const controlButtons = controls.querySelectorAll('.control-button');
        controlButtons.forEach(button => {
            button.style.cssText = `
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                color: white;
                font-size: 14px;
                cursor: pointer;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                min-width: 60px;
                text-align: center;
                transition: all 0.2s;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(255, 255, 255, 0.3)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(255, 255, 255, 0.2)';
            });
        });

        // 事件监听
        controls.querySelector('#speed-control').addEventListener('click', showSpeedDropdown);
        controls.querySelector('#size-control').addEventListener('click', showSizeDropdown);
        controls.querySelector('#exit-fullscreen').addEventListener('click', exitFullscreen);

        document.body.appendChild(controls);

        // 更新进度条
        updateProgressBar();
    }

    // 隐藏全屏控制栏
    function hideFullscreenControls() {
        const controls = document.getElementById('video-fullscreen-controls');
        if (controls) {
            controls.remove();
        }
    }

    // 更新进度条
    function updateProgressBar() {
        if (!currentVideo) return;

        const progressFill = document.querySelector('.progress-fill');
        if (!progressFill) return;

        const update = () => {
            if (currentVideo.duration) {
                const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
                progressFill.style.width = `${progress}%`;
            }
        };

        currentVideo.addEventListener('timeupdate', update);
        update();
    }

    // 显示倍速选择器（浮窗滑动版本）
    function showSpeedSelector() {
        if (!currentVideo) return;

        let selector = document.getElementById('speed-selector');
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        selector = document.createElement('div');
        selector.id = 'speed-selector';
        selector.innerHTML = `
            <div class="speed-slider-container">
                <div class="speed-header">
                    <span>播放速度</span>
                    <div class="current-speed">${currentVideo.playbackRate}x</div>
                </div>
                <div class="speed-slider">
                    <div class="speed-track">
                        <div class="speed-thumb"></div>
                    </div>
                </div>
                <div class="speed-markers">
                    ${CONFIG.speeds.map(speed => `
                        <div class="speed-marker" data-speed="${speed}">${speed}x</div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border-radius: 16px;
            padding: 20px;
            z-index: 10002;
            min-width: 280px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            gap: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const container = selector.querySelector('.speed-slider-container');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            color: white;
        `;

        const header = selector.querySelector('.speed-header');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            font-weight: bold;
        `;

        const currentSpeed = selector.querySelector('.current-speed');
        currentSpeed.style.cssText = `
            font-size: 18px;
            color: #ff4444;
            font-weight: bold;
        `;

        const slider = selector.querySelector('.speed-slider');
        slider.style.cssText = `
            width: 100%;
            padding: 10px 0;
        `;

        const track = selector.querySelector('.speed-track');
        track.style.cssText = `
            position: relative;
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            cursor: pointer;
        `;

        const thumb = selector.querySelector('.speed-thumb');
        thumb.style.cssText = `
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: #ff4444;
            border-radius: 50%;
            cursor: grab;
            box-shadow: 0 2px 8px rgba(255, 68, 68, 0.4);
            transition: all 0.2s;
        `;

        const markers = selector.querySelector('.speed-markers');
        markers.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
        `;

        const markerElements = selector.querySelectorAll('.speed-marker');
        markerElements.forEach(marker => {
            marker.style.cssText = `
                text-align: center;
                min-width: 30px;
            `;
        });

        // 初始化滑块位置
        updateSliderPosition();

        // 滑块交互逻辑
        let isDragging = false;

        const startDrag = (e) => {
            isDragging = true;
            thumb.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const stopDrag = () => {
            isDragging = false;
            thumb.style.cursor = 'grab';
        };

        const handleDrag = (e) => {
            if (!isDragging) return;

            const rect = track.getBoundingClientRect();
            let clientX;
            
            if (e.type.includes('touch')) {
                clientX = e.touches[0].clientX;
            } else {
                clientX = e.clientX;
            }

            let position = (clientX - rect.left) / rect.width;
            position = Math.max(0, Math.min(1, position));
            
            const speedIndex = Math.round(position * (CONFIG.speeds.length - 1));
            const speed = CONFIG.speeds[speedIndex];
            
            setPlaybackSpeed(speed);
            updateSliderPosition();
        };

        // 事件监听
        thumb.addEventListener('mousedown', startDrag);
        thumb.addEventListener('touchstart', startDrag);
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('touchmove', handleDrag);
        
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        // 点击轨道直接选择
        track.addEventListener('click', (e) => {
            const rect = track.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            const speedIndex = Math.round(position * (CONFIG.speeds.length - 1));
            const speed = CONFIG.speeds[speedIndex];
            setPlaybackSpeed(speed);
            updateSliderPosition();
        });

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target)) {
                    selector.style.display = 'none';
                }
            }, { once: true });
        }, 100);

        document.body.appendChild(selector);
    }

    // 更新滑块位置
    function updateSliderPosition() {
        if (!currentVideo) return;
        
        const selector = document.getElementById('speed-selector');
        if (!selector) return;
        
        const currentSpeed = currentVideo.playbackRate;
        const speedIndex = CONFIG.speeds.indexOf(currentSpeed);
        const position = speedIndex / (CONFIG.speeds.length - 1);
        
        const thumb = selector.querySelector('.speed-thumb');
        const track = selector.querySelector('.speed-track');
        
        if (thumb && track) {
            thumb.style.left = `${position * 100}%`;
        }
        
        const currentSpeedDisplay = selector.querySelector('.current-speed');
        if (currentSpeedDisplay) {
            currentSpeedDisplay.textContent = `${currentSpeed}x`;
        }
    }

    // 显示倍速下拉菜单（全屏模式）
    function showSpeedDropdown() {
        if (!currentVideo) return;

        let dropdown = document.getElementById('speed-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            return;
        }

        dropdown = document.createElement('div');
        dropdown.id = 'speed-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-content">
                ${CONFIG.speeds.map(speed => `
                    <div class="dropdown-option" data-speed="${speed}">
                        <span>${speed}x</span>
                    </div>
                `).join('')}
            </div>
        `;

        dropdown.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 8px 0;
            z-index: 10003;
            min-width: 80px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: block;
        `;

        const content = dropdown.querySelector('.dropdown-content');
        content.style.cssText = `
            color: white;
        `;

        const options = dropdown.querySelectorAll('.dropdown-option');
        options.forEach(option => {
            option.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 14px;
                text-align: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(option.getAttribute('data-speed'));
                setPlaybackSpeed(speed);
                dropdown.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        options[options.length - 1].style.borderBottom = 'none';

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            }, { once: true });
        }, 100);
    }

    // 显示画面尺寸选择器
    function showSizeSelector() {
        if (!currentVideo) return;

        let selector = document.getElementById('size-selector');
        if (selector) {
            selector.style.display = 'block';
            return;
        }

        selector = document.createElement('div');
        selector.id = 'size-selector';
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>画面尺寸</span>
                </div>
                <div class="selector-options">
                    ${CONFIG.sizes.map(size => `
                        <div class="option" data-size="${size.value}">
                            <span>${size.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            bottom: 130px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 0;
            z-index: 10002;
            min-width: 100px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: block;
        `;

        const content = selector.querySelector('.selector-content');
        content.style.cssText = `
            color: white;
        `;

        const header = selector.querySelector('.selector-header');
        header.style.cssText = `
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: bold;
            font-size: 14px;
        `;

        const options = selector.querySelector('.selector-options');
        options.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
        `;

        const optionElements = selector.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 14px;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = option.getAttribute('data-size');
                const sizeName = option.querySelector('span').textContent;
                applyVideoSize(size, sizeName);
                selector.style.display = 'none';
            });
            option.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const size = option.getAttribute('data-size');
                const sizeName = option.querySelector('span').textContent;
                applyVideoSize(size, sizeName);
                selector.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        optionElements[optionElements.length - 1].style.borderBottom = 'none';

        document.body.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                selector.style.display = 'none';
            }, { once: true });
        }, 100);
    }

    // 显示画面尺寸下拉菜单（全屏模式）
    function showSizeDropdown() {
        if (!currentVideo) return;

        let dropdown = document.getElementById('size-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            return;
        }

        dropdown = document.createElement('div');
        dropdown.id = 'size-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-content">
                ${CONFIG.sizes.map(size => `
                    <div class="dropdown-option" data-size="${size.value}">
                        <span>${size.name}</span>
                    </div>
                `).join('')}
            </div>
        `;

        dropdown.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 8px 0;
            z-index: 10003;
            min-width: 80px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: block;
        `;

        const content = dropdown.querySelector('.dropdown-content');
        content.style.cssText = `
            color: white;
        `;

        const options = dropdown.querySelectorAll('.dropdown-option');
        options.forEach(option => {
            option.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 14px;
                text-align: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = option.getAttribute('data-size');
                const sizeName = option.querySelector('span').textContent;
                applyVideoSize(size, sizeName);
                dropdown.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        options[options.length - 1].style.borderBottom = 'none';

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            }, { once: true });
        }, 100);
    }

    // 设置播放速度
    function setPlaybackSpeed(speed) {
        if (!currentVideo) return;

        currentVideo.playbackRate = speed;
        
        // 更新控制面板显示
        const speedControl = document.querySelector('#speed-control span');
        if (speedControl) {
            speedControl.textContent = `${speed}`;
        }

        console.log(`播放速度设置为: ${speed}x`);
    }

    // 应用画面尺寸
    function applyVideoSize(size, sizeName) {
        if (!currentVideo) return;

        switch (size) {
            case 'fill':
                currentVideo.style.objectFit = 'fill';
                break;
            case 'stretch':
                currentVideo.style.objectFit = 'none';
                currentVideo.style.width = '100%';
                currentVideo.style.height = '100%';
                break;
            case 'contain':
                currentVideo.style.objectFit = 'contain';
                break;
            case 'none':
                currentVideo.style.objectFit = 'none';
                currentVideo.style.width = 'auto';
                currentVideo.style.height = 'auto';
                break;
        }

        // 更新控制面板显示
        const sizeControl = document.querySelector('#size-control span');
        if (sizeControl) {
            sizeControl.textContent = sizeName;
        }

        console.log(`画面尺寸设置为: ${sizeName}`);
    }

    // 启动脚本
    init();
})();

