// ==UserScript==
// @name         网页视频播放助手 - 调试版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  手机浏览器视频播放助手 - 调试版本，包含详细日志
// @author       Video Assistant
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置项
    const CONFIG = {
        playbackRates: [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
        videoSizes: [
            { name: '填充', value: 'fill' },
            { name: '拉伸', value: 'stretch' },
            { name: '适应', value: 'fit' },
            { name: '原始', value: 'original' }
        ]
    };

    // 全局变量
    let currentVideo = null;
    let isFullscreen = false;
    let originalVideoStyle = null;
    let floatingButton = null;
    let controlPanel = null;
    let fullscreenControls = null;

    // 调试日志
    function debugLog(message, data = null) {
        console.log(`[视频助手] ${message}`, data || '');
    }

    // 显示调试信息
    function showDebugInfo() {
        const debugDiv = document.createElement('div');
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 99999;
            max-width: 300px;
        `;
        debugDiv.innerHTML = `
            <div>视频助手调试信息</div>
            <div>当前视频: ${currentVideo ? '已找到' : '未找到'}</div>
            <div>悬浮按钮: ${floatingButton ? '已创建' : '未创建'}</div>
            <div>全屏状态: ${isFullscreen ? '是' : '否'}</div>
        `;
        document.body.appendChild(debugDiv);

        setTimeout(() => {
            if (document.body.contains(debugDiv)) {
                document.body.removeChild(debugDiv);
            }
        }, 5000);
    }

    // 初始化
    function init() {
        debugLog('脚本初始化开始');

        // 添加样式
        addStyles();

        // 显示初始化信息
        showDebugInfo();

        // 监听页面变化
        observeVideoElements();

        // 定期检查视频元素
        setInterval(checkForVideos, 1000);

        // 添加手动触发按钮（用于调试）
        addManualTrigger();

        debugLog('脚本初始化完成');
    }

    // 添加手动触发按钮
    function addManualTrigger() {
        const triggerBtn = document.createElement('button');
        triggerBtn.textContent = '手动显示悬浮按钮';
        triggerBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            z-index: 99999;
            font-size: 12px;
        `;
        triggerBtn.addEventListener('click', () => {
            const videos = document.querySelectorAll('video');
            debugLog('手动触发，找到视频数量:', videos.length);
            if (videos.length > 0) {
                currentVideo = videos[0];
                showFloatingButton();
                showDebugInfo();
            }
        });
        document.body.appendChild(triggerBtn);
    }

    // 定期检查视频元素
    function checkForVideos() {
        const videos = document.querySelectorAll('video');
        debugLog('定期检查，视频数量:', videos.length);

        videos.forEach((video, index) => {
            if (!video.dataset.videoAssistantSetup) {
                debugLog(`设置新视频监听 #${index}`, {
                    paused: video.paused,
                    ended: video.ended,
                    currentTime: video.currentTime,
                    duration: video.duration
                });
                setupVideo(video);
            }
        });
    }

    // 添加样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .video-assistant-floating-btn {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 44px;
                height: 44px;
                background: rgba(255, 0, 0, 0.8); /* 红色便于调试 */
                border-radius: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                border: 2px solid white;
            }

            .video-assistant-floating-btn::before {
                content: '⚙️';
                font-size: 20px;
                color: white;
            }

            .video-assistant-control-panel {
                position: fixed;
                bottom: 130px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 12px;
                padding: 15px;
                z-index: 10001;
                min-width: 150px;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                border: 1px solid #007bff;
            }

            .video-assistant-control-item {
                color: white;
                padding: 12px 16px;
                margin: 5px 0;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .video-assistant-control-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .video-assistant-fullscreen-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: black;
                z-index: 10002;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }

            .video-assistant-fullscreen-video {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }

            .video-assistant-fullscreen-controls {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 10003;
            }

            .video-assistant-control-group {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .video-assistant-control-button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s ease;
            }

            .video-assistant-control-button:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .video-assistant-dropdown {
                position: absolute;
                bottom: 100%;
                left: 0;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 8px;
                padding: 10px;
                min-width: 120px;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .video-assistant-dropdown-item {
                color: white;
                padding: 10px 12px;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.2s ease;
                font-size: 13px;
            }

            .video-assistant-dropdown-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .video-assistant-progress-bar {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                margin: 0 15px;
                position: relative;
                cursor: pointer;
            }

            .video-assistant-progress-filled {
                position: absolute;
                height: 100%;
                background: #ff4444;
                border-radius: 2px;
                width: 0%;
            }

            .video-assistant-hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        debugLog('样式已添加');
    }

    // 监听视频元素
    function observeVideoElements() {
        debugLog('开始监听视频元素变化');

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'VIDEO') {
                            debugLog('发现新的视频元素');
                            setupVideo(node);
                        } else {
                            const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
                            if (videos.length > 0) {
                                debugLog(`在节点中发现 ${videos.length} 个视频元素`);
                                videos.forEach(setupVideo);
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

        // 检查现有视频
        const existingVideos = document.querySelectorAll('video');
        debugLog('检查现有视频数量:', existingVideos.length);
        existingVideos.forEach(setupVideo);
    }

    // 设置视频监听
    function setupVideo(video) {
        if (video.dataset.videoAssistantSetup) {
            debugLog('视频已设置过监听，跳过');
            return;
        }
        video.dataset.videoAssistantSetup = 'true';

        debugLog('设置视频监听', {
            src: video.src,
            paused: video.paused,
            ended: video.ended
        });

        const showButton = () => {
            debugLog('显示悬浮按钮触发');
            currentVideo = video;
            showFloatingButton();
            showDebugInfo();
        };

        const hideButton = () => {
            debugLog('隐藏悬浮按钮触发');
            hideFloatingButton();
            hideControlPanel();
        };

        // 监听多种播放相关事件
        const events = ['play', 'playing', 'canplay', 'pause', 'ended', 'waiting'];
        events.forEach(event => {
            video.addEventListener(event, (e) => {
                debugLog(`视频事件: ${event}`, {
                    paused: video.paused,
                    ended: video.ended,
                    currentTime: video.currentTime
                });
            });
        });

        video.addEventListener('play', showButton);
        video.addEventListener('playing', showButton);
        video.addEventListener('canplay', () => {
            if (!video.paused && !video.ended) {
                debugLog('视频已可播放且正在播放，显示按钮');
                showButton();
            }
        });

        video.addEventListener('pause', hideButton);
        video.addEventListener('ended', hideButton);
        video.addEventListener('waiting', hideButton);

        // 检查是否已经有视频在播放
        if (!video.paused && !video.ended) {
            debugLog('视频已在播放，立即显示按钮');
            setTimeout(() => showButton(), 100);
        }

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            debugLog('页面可见性变化', { hidden: document.hidden });
            if (document.hidden) {
                hideButton();
            } else if (!video.paused && !video.ended) {
                setTimeout(() => showButton(), 500);
            }
        });
    }

    // 显示悬浮按钮
    function showFloatingButton() {
        debugLog('显示悬浮按钮');

        if (floatingButton) {
            floatingButton.classList.remove('video-assistant-hidden');
            return;
        }

        floatingButton = document.createElement('div');
        floatingButton.className = 'video-assistant-floating-btn';
        floatingButton.title = '视频播放助手';

        floatingButton.addEventListener('click', (e) => {
            e.stopPropagation();
            debugLog('悬浮按钮被点击');
            toggleControlPanel();
        });

        document.body.appendChild(floatingButton);
        debugLog('悬浮按钮已创建并显示');
    }

    // 隐藏悬浮按钮
    function hideFloatingButton() {
        debugLog('隐藏悬浮按钮');
        if (floatingButton) {
            floatingButton.classList.add('video-assistant-hidden');
        }
    }

    // 切换控制面板
    function toggleControlPanel() {
        if (controlPanel && !controlPanel.classList.contains('video-assistant-hidden')) {
            hideControlPanel();
        } else {
            showControlPanel();
        }
    }

    // 显示控制面板
    function showControlPanel() {
        debugLog('显示控制面板');

        if (controlPanel) {
            controlPanel.classList.remove('video-assistant-hidden');
            return;
        }

        controlPanel = document.createElement('div');
        controlPanel.className = 'video-assistant-control-panel';

        const fullscreenItem = createControlItem('全屏播放', () => {
            debugLog('全屏播放被点击');
            enterFullscreen();
            hideControlPanel();
        });

        const speedItem = createControlItem('倍速选择', () => {
            debugLog('倍速选择被点击');
            showSpeedSelector();
        });

        const sizeItem = createControlItem('画面尺寸', () => {
            debugLog('画面尺寸被点击');
            showSizeSelector();
        });

        controlPanel.appendChild(fullscreenItem);
        controlPanel.appendChild(speedItem);
        controlPanel.appendChild(sizeItem);

        document.body.appendChild(controlPanel);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', hideControlPanel, { once: true });
        }, 100);
    }

    // 创建控制项
    function createControlItem(text, onClick) {
        const item = document.createElement('div');
        item.className = 'video-assistant-control-item';
        item.textContent = text;
        item.addEventListener('click', onClick);
        return item;
    }

    // 隐藏控制面板
    function hideControlPanel() {
        debugLog('隐藏控制面板');
        if (controlPanel) {
            controlPanel.classList.add('video-assistant-hidden');
        }
    }

    // 进入全屏模式
    function enterFullscreen() {
        if (!currentVideo) {
            debugLog('无法进入全屏：没有当前视频');
            return;
        }

        debugLog('进入全屏模式');
        isFullscreen = true;
        originalVideoStyle = currentVideo.style.cssText;

        const overlay = document.createElement('div');
        overlay.className = 'video-assistant-fullscreen-overlay';

        const videoClone = currentVideo.cloneNode(true);
        videoClone.className = 'video-assistant-fullscreen-video';
        videoClone.controls = false;

        // 设置视频尺寸适应
        const isPortrait = currentVideo.videoHeight > currentVideo.videoWidth;
        if (isPortrait) {
            videoClone.style.maxHeight = '100%';
            videoClone.style.width = 'auto';
        } else {
            videoClone.style.maxWidth = '100%';
            videoClone.style.height = 'auto';
        }

        overlay.appendChild(videoClone);
        document.body.appendChild(overlay);

        // 播放克隆的视频
        videoClone.play();

        // 创建全屏控制栏
        createFullscreenControls(overlay, videoClone);

        // 退出全屏事件
        const exitFullscreen = () => {
            debugLog('退出全屏模式');
            isFullscreen = false;
            document.body.removeChild(overlay);
            if (currentVideo) {
                currentVideo.style.cssText = originalVideoStyle;
                currentVideo.play();
            }
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                exitFullscreen();
            }
        });

        // ESC键退出
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                exitFullscreen();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    // 创建全屏控制栏
    function createFullscreenControls(overlay, video) {
        fullscreenControls = document.createElement('div');
        fullscreenControls.className = 'video-assistant-fullscreen-controls';

        // 进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'video-assistant-progress-bar';
        const progressFilled = document.createElement('div');
        progressFilled.className = 'video-assistant-progress-filled';
        progressBar.appendChild(progressFilled);

        // 更新进度条
        const updateProgress = () => {
            if (video.duration) {
                const progress = (video.currentTime / video.duration) * 100;
                progressFilled.style.width = `${progress}%`;
            }
        };

        video.addEventListener('timeupdate', updateProgress);

        // 点击进度条跳转
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });

        // 倍速按钮
        const speedButton = document.createElement('button');
        speedButton.className = 'video-assistant-control-button';
        speedButton.textContent = `${video.playbackRate}x`;

        speedButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showSpeedDropdown(speedButton, video);
        });

        // 尺寸按钮
        const sizeButton = document.createElement('button');
        sizeButton.className = 'video-assistant-control-button';
        sizeButton.textContent = '原始';

        sizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showSizeDropdown(sizeButton, video);
        });

        // 退出按钮（手机端专用）
        const exitButton = document.createElement('button');
        exitButton.className = 'video-assistant-control-button';
        exitButton.textContent = '退出';
        exitButton.style.background = 'rgba(255, 68, 68, 0.8)';

        exitButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isFullscreen = false;
            document.body.removeChild(overlay);
            if (currentVideo) {
                currentVideo.style.cssText = originalVideoStyle;
                currentVideo.play();
            }
        });

        // 双击退出功能
        let lastTap = 0;
        overlay.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                // 双击退出
                isFullscreen = false;
                document.body.removeChild(overlay);
                if (currentVideo) {
                    currentVideo.style.cssText = originalVideoStyle;
                    currentVideo.play();
                }
            }
            lastTap = currentTime;
        });

        const controlGroup = document.createElement('div');
        controlGroup.className = 'video-assistant-control-group';
        controlGroup.appendChild(speedButton);
        controlGroup.appendChild(sizeButton);
        controlGroup.appendChild(exitButton);

        fullscreenControls.appendChild(progressBar);
        fullscreenControls.appendChild(controlGroup);
        overlay.appendChild(fullscreenControls);

        debugLog('全屏控制栏已创建');
    }

    // 显示倍速下拉菜单
    function showSpeedDropdown(button, video) {
        debugLog('显示倍速下拉菜单');

        const existingDropdown = document.querySelector('.video-assistant-dropdown');
        if (existingDropdown) {
            document.body.removeChild(existingDropdown);
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'video-assistant-dropdown';

        const rect = button.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.bottom = `${window.innerHeight - rect.top}px`;

        CONFIG.playbackRates.forEach(rate => {
            const item = document.createElement('div');
            item.className = 'video-assistant-dropdown-item';
            item.textContent = `${rate}x`;
            if (video.playbackRate === rate) {
                item.style.background = 'rgba(255, 255, 255, 0.2)';
            }
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                video.playbackRate = rate;
                button.textContent = `${rate}x`;
                document.body.removeChild(dropdown);
                debugLog(`设置播放倍速: ${rate}x`);
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (document.body.contains(dropdown)) {
                    document.body.removeChild(dropdown);
                }
            }, { once: true });
        }, 100);
    }

    // 显示尺寸下拉菜单
    function showSizeDropdown(button, video) {
        debugLog('显示尺寸下拉菜单');

        const existingDropdown = document.querySelector('.video-assistant-dropdown');
        if (existingDropdown) {
            document.body.removeChild(existingDropdown);
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'video-assistant-dropdown';

        const rect = button.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.bottom = `${window.innerHeight - rect.top}px`;

        CONFIG.videoSizes.forEach(size => {
            const item = document.createElement('div');
            item.className = 'video-assistant-dropdown-item';
            item.textContent = size.name;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                applyVideoSize(video, size.value);
                button.textContent = size.name;
                document.body.removeChild(dropdown);
                debugLog(`设置画面尺寸: ${size.name}`);
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (document.body.contains(dropdown)) {
                    document.body.removeChild(dropdown);
                }
            }, { once: true });
        }, 100);
    }

    // 应用视频尺寸
    function applyVideoSize(video, size) {
        debugLog(`应用视频尺寸: ${size}`);

        switch (size) {
            case 'fill':
                video.style.objectFit = 'fill';
                break;
            case 'stretch':
                video.style.objectFit = 'none';
                video.style.width = '100%';
                video.style.height = '100%';
                break;
            case 'fit':
                video.style.objectFit = 'contain';
                break;
            case 'original':
                video.style.objectFit = 'none';
                video.style.width = 'auto';
                video.style.height = 'auto';
                break;
        }
    }

    // 显示倍速选择器
    function showSpeedSelector() {
        debugLog('显示倍速选择器');

        const existingDropdown = document.querySelector('.video-assistant-dropdown');
        if (existingDropdown) {
            document.body.removeChild(existingDropdown);
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'video-assistant-dropdown';

        const rect = controlPanel.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.bottom = `${window.innerHeight - rect.top + 10}px`;

        CONFIG.playbackRates.forEach(rate => {
            const item = document.createElement('div');
            item.className = 'video-assistant-dropdown-item';
            item.textContent = `${rate}x`;
            if (currentVideo && currentVideo.playbackRate === rate) {
                item.style.background = 'rgba(255, 255, 255, 0.2)';
            }
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentVideo) {
                    currentVideo.playbackRate = rate;
                    debugLog(`设置播放倍速: ${rate}x`);
                }
                document.body.removeChild(dropdown);
                hideControlPanel();
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (document.body.contains(dropdown)) {
                    document.body.removeChild(dropdown);
                }
            }, { once: true });
        }, 100);
    }

    // 显示尺寸选择器
    function showSizeSelector() {
        debugLog('显示尺寸选择器');

        const existingDropdown = document.querySelector('.video-assistant-dropdown');
        if (existingDropdown) {
            document.body.removeChild(existingDropdown);
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'video-assistant-dropdown';

        const rect = controlPanel.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.bottom = `${window.innerHeight - rect.top + 10}px`;

        CONFIG.videoSizes.forEach(size => {
            const item = document.createElement('div');
            item.className = 'video-assistant-dropdown-item';
            item.textContent = size.name;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentVideo) {
                    applyVideoSize(currentVideo, size.value);
                    debugLog(`设置画面尺寸: ${size.name}`);
                }
                document.body.removeChild(dropdown);
                hideControlPanel();
            });
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (document.body.contains(dropdown)) {
                    document.body.removeChild(dropdown);
                }
            }, { once: true });
        }, 100);
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
