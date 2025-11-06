// ==UserScript==
// @name         网页视频播放助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  手机浏览器视频播放助手，支持全屏、倍速、画面比例调整
// @author       Your Name
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let currentVideo = null;
    let floatingButton = null;
    let controlPanel = null;
    let isFullscreen = false;
    let originalContainer = null;

    // 倍速选项
    const playbackRates = [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0];
    
    // 画面比例选项
    const aspectRatios = {
        '填充': 'fill',
        '拉伸': 'stretch',
        '适应': 'contain',
        '原始': 'original'
    };

    // 创建悬浮按钮
    function createFloatingButton() {
        if (floatingButton) return;

        floatingButton = document.createElement('div');
        floatingButton.innerHTML = '🍀';
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            z-index: 10000;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;

        floatingButton.addEventListener('click', toggleControlPanel);
        document.body.appendChild(floatingButton);

        // 添加拖拽功能
        let isDragging = false;
        let startX, startY, initialX, initialY;

        floatingButton.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            initialX = floatingButton.offsetLeft;
            initialY = floatingButton.offsetTop;
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;
            floatingButton.style.left = (initialX + deltaX) + 'px';
            floatingButton.style.top = (initialY + deltaY) + 'px';
            floatingButton.style.right = 'auto';
            floatingButton.style.bottom = 'auto';
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // 创建控制面板
    function createControlPanel() {
        if (controlPanel) return;

        controlPanel = document.createElement('div');
        controlPanel.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 16px;
            z-index: 10001;
            display: none;
            min-width: 200px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        `;

        controlPanel.innerHTML = `
            <div style="color: white; margin-bottom: 12px; font-size: 14px; font-weight: bold;">播放设置</div>
            <button id="fullscreenBtn" style="
                width: 100%;
                padding: 10px;
                margin-bottom: 8px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
            ">全屏播放</button>
            <button id="speedBtn" style="
                width: 100%;
                padding: 10px;
                margin-bottom: 8px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
            ">倍速选择</button>
            <button id="aspectBtn" style="
                width: 100%;
                padding: 10px;
                background: #FF9800;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
            ">画面尺寸</button>
        `;

        document.body.appendChild(controlPanel);

        // 绑定事件
        document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
        document.getElementById('speedBtn').addEventListener('click', showSpeedMenu);
        document.getElementById('aspectBtn').addEventListener('click', showAspectMenu);
    }

    // 切换控制面板显示
    function toggleControlPanel() {
        if (!controlPanel) createControlPanel();
        controlPanel.style.display = controlPanel.style.display === 'none' ? 'block' : 'none';
    }

    // 全屏功能
    function toggleFullscreen() {
        if (!currentVideo) return;

        if (!isFullscreen) {
            originalContainer = currentVideo.parentElement;
            
            // 创建全屏容器
            const fullscreenContainer = document.createElement('div');
            fullscreenContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: black;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // 移动视频到全屏容器
            fullscreenContainer.appendChild(currentVideo);
            document.body.appendChild(fullscreenContainer);

            // 设置视频样式
            currentVideo.style.width = '100%';
            currentVideo.style.height = '100%';
            currentVideo.style.objectFit = 'contain';

            // 创建全屏控制栏
            createFullscreenControls(fullscreenContainer);

            isFullscreen = true;
        } else {
            exitFullscreen();
        }
    }

    // 退出全屏
    function exitFullscreen() {
        if (!isFullscreen || !originalContainer) return;

        // 恢复视频到原始位置
        originalContainer.appendChild(currentVideo);
        currentVideo.style.cssText = '';
        
        // 移除全屏容器
        const fullscreenContainer = document.querySelector('.fullscreen-container');
        if (fullscreenContainer) {
            fullscreenContainer.remove();
        }

        isFullscreen = false;
    }

    // 创建全屏控制栏
    function createFullscreenControls(container) {
        const controls = document.createElement('div');
        controls.className = 'fullscreen-controls';
        controls.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 12px 20px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 1000000;
        `;

        controls.innerHTML = `
            <div style="color: white; font-size: 12px;">
                <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
            </div>
            <input type="range" id="progressBar" style="width: 150px;" min="0" max="100" value="0">
            <button id="speedDisplay" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            ">1.0x</button>
            <button id="aspectDisplay" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            ">原始</button>
            <button id="exitFullscreen" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            ">退出</button>
        `;

        container.appendChild(controls);
        container.classList.add('fullscreen-container');

        // 绑定事件
        setupFullscreenControls(controls);
    }

    // 设置全屏控制栏事件
    function setupFullscreenControls(controls) {
        const progressBar = controls.querySelector('#progressBar');
        const speedDisplay = controls.querySelector('#speedDisplay');
        const aspectDisplay = controls.querySelector('#aspectDisplay');
        const exitBtn = controls.querySelector('#exitFullscreen');

        // 进度条
        progressBar.addEventListener('input', (e) => {
            if (currentVideo) {
                currentVideo.currentTime = (e.target.value / 100) * currentVideo.duration;
            }
        });

        // 更新进度
        const updateProgress = () => {
            if (currentVideo && currentVideo.duration) {
                progressBar.value = (currentVideo.currentTime / currentVideo.duration) * 100;
                controls.querySelector('#currentTime').textContent = formatTime(currentVideo.currentTime);
                controls.querySelector('#duration').textContent = formatTime(currentVideo.duration);
            }
        };

        currentVideo.addEventListener('timeupdate', updateProgress);

        // 倍速显示
        speedDisplay.addEventListener('click', () => {
            showSpeedMenuAtElement(speedDisplay);
        });

        // 画面比例显示
        aspectDisplay.addEventListener('click', () => {
            showAspectMenuAtElement(aspectDisplay);
        });

        // 退出全屏
        exitBtn.addEventListener('click', exitFullscreen);
    }

    // 格式化时间
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 显示倍速菜单
    function showSpeedMenu() {
        showSpeedMenuAtElement(controlPanel);
    }

    function showSpeedMenuAtElement(element) {
        const menu = createMenu(playbackRates.map(rate => `${rate}x`), (selected) => {
            const speed = parseFloat(selected.replace('x', ''));
            if (currentVideo) {
                currentVideo.playbackRate = speed;
                updateSpeedDisplay(speed);
            }
        });
        
        positionMenu(menu, element);
    }

    // 显示画面比例菜单
    function showAspectMenu() {
        showAspectMenuAtElement(controlPanel);
    }

    function showAspectMenuAtElement(element) {
        const menu = createMenu(Object.keys(aspectRatios), (selected) => {
            if (currentVideo) {
                setVideoAspect(aspectRatios[selected]);
                updateAspectDisplay(selected);
            }
        });
        
        positionMenu(menu, element);
    }

    // 创建菜单
    function createMenu(items, callback) {
        const existingMenu = document.querySelector('.floating-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'floating-menu';
        menu.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10002;
            min-width: 120px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        `;

        items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item;
            menuItem.style.cssText = `
                padding: 12px 16px;
                color: white;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            menuItem.addEventListener('click', () => {
                callback(item);
                menu.remove();
            });
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);
        return menu;
    }

    // 定位菜单
    function positionMenu(menu, element) {
        const rect = element.getBoundingClientRect();
        menu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        menu.style.left = rect.left + 'px';
    }

    // 更新倍速显示
    function updateSpeedDisplay(speed) {
        const speedDisplay = document.querySelector('#speedDisplay');
        if (speedDisplay) speedDisplay.textContent = speed + 'x';
    }

    // 更新画面比例显示
    function updateAspectDisplay(ratio) {
        const aspectDisplay = document.querySelector('#aspectDisplay');
        if (aspectDisplay) aspectDisplay.textContent = ratio;
    }

    // 设置视频画面比例
    function setVideoAspect(mode) {
        if (!currentVideo) return;

        switch(mode) {
            case 'fill':
                currentVideo.style.objectFit = 'cover';
                break;
            case 'stretch':
                currentVideo.style.objectFit = 'fill';
                break;
            case 'contain':
                currentVideo.style.objectFit = 'contain';
                break;
            case 'original':
                currentVideo.style.objectFit = 'none';
                break;
        }
    }

    // 检测视频元素
    function detectVideo() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            // 检查视频是否正在播放
            const checkPlaying = () => {
                if (video.readyState >= 2 && !floatingButton) {
                    currentVideo = video;
                    createFloatingButton();
                }
            };

            video.addEventListener('play', checkPlaying);
            video.addEventListener('loadeddata', checkPlaying);
        });
    }

    // 初始化
    function init() {
        // 立即检测一次
        detectVideo();

        // 监听DOM变化，检测新视频
        const observer = new MutationObserver(() => {
            detectVideo();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 点击其他地方关闭控制面板
        document.addEventListener('click', (e) => {
            if (controlPanel && 
                !controlPanel.contains(e.target) && 
                !floatingButton.contains(e.target)) {
                controlPanel.style.display = 'none';
            }
        });

        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            const menu = document.querySelector('.floating-menu');
            if (menu && !menu.contains(e.target)) {
                menu.remove();
            }
        });
    }

    // 启动脚本
    init();
})();
