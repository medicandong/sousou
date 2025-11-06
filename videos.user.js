// ==UserScript==
// @name         网页视频播放助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  手机浏览器播放视频助手，支持全屏、倍速、画面尺寸调整
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let currentVideo = null;
    let floatingButton = null;
    let controlPanel = null;
    let isFullscreen = false;
    let originalParent = null;
    let originalStyles = {};

    const playRates = [0.5, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0];
    const aspectModes = ['原始', '适应', '拉伸', '填充'];
    let currentPlayRate = 1.0;
    let currentAspectMode = '原始';

    function createFloatingButton() {
        if (floatingButton) return;

        floatingButton = document.createElement('div');
        floatingButton.innerHTML = '🍀';
        floatingButton.style.cssText = `
            position: fixed;
            width: 40px;
            height: 40px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            z-index: 999999;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        floatingButton.addEventListener('click', showControlPanel);
        document.body.appendChild(floatingButton);
    }

    function createControlPanel() {
        if (controlPanel) return;

        controlPanel = document.createElement('div');
        controlPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000000;
            display: none;
            flex-direction: column;
            gap: 15px;
            min-width: 200px;
        `;

        controlPanel.innerHTML = `
            <div style="text-align: center; font-size: 16px; margin-bottom: 10px;">播放设置</div>
            <button id="fullscreenBtn" style="padding: 10px; background: #2196F3; color: white; border: none; border-radius: 5px; font-size: 14px;">全屏播放</button>
            <button id="speedBtn" style="padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 14px;">倍速选择</button>
            <button id="closeBtn" style="padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; font-size: 14px;">关闭</button>
        `;

        document.body.appendChild(controlPanel);

        document.getElementById('fullscreenBtn').addEventListener('click', enterFullscreen);
        document.getElementById('speedBtn').addEventListener('click', showSpeedMenu);
        document.getElementById('closeBtn').addEventListener('click', hideControlPanel);
    }

    function showControlPanel() {
        if (controlPanel) {
            controlPanel.style.display = 'flex';
        }
    }

    function hideControlPanel() {
        if (controlPanel) {
            controlPanel.style.display = 'none';
        }
    }

    function enterFullscreen() {
        if (!currentVideo) return;

        hideControlPanel();
        
        if (currentVideo.requestFullscreen) {
            currentVideo.requestFullscreen();
        } else if (currentVideo.webkitRequestFullscreen) {
            currentVideo.webkitRequestFullscreen();
        } else if (currentVideo.mozRequestFullScreen) {
            currentVideo.mozRequestFullScreen();
        }

        // 检测视频宽高比，决定横竖屏
        const videoWidth = currentVideo.videoWidth;
        const videoHeight = currentVideo.videoHeight;
        const aspectRatio = videoWidth / videoHeight;

        if (aspectRatio > 1) {
            // 横屏视频
            screen.orientation.lock('landscape').catch(() => {});
        } else {
            // 竖屏视频
            screen.orientation.lock('portrait').catch(() => {});
        }

        createFullscreenControls();
        isFullscreen = true;
    }

    function createFullscreenControls() {
        const controls = document.createElement('div');
        controls.id = 'videoAssistantControls';
        controls.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: flex;
            gap: 20px;
            align-items: center;
            z-index: 1000001;
        `;

        controls.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>进度条</span>
                <input type="range" id="progressBar" min="0" max="100" value="0" style="width: 100px;">
            </div>
            <button id="speedDisplay" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; border-radius: 5px;">${currentPlayRate}</button>
            <button id="aspectDisplay" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; border-radius: 5px;">${currentAspectMode}</button>
            <button id="exitFullscreen" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; border-radius: 5px;">退出</button>
        `;

        document.body.appendChild(controls);

        // 绑定事件
        document.getElementById('speedDisplay').addEventListener('click', showSpeedMenu);
        document.getElementById('aspectDisplay').addEventListener('click', showAspectMenu);
        document.getElementById('exitFullscreen').addEventListener('click', exitFullscreen);

        // 更新进度条
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('input', (e) => {
            if (currentVideo) {
                currentVideo.currentTime = (e.target.value / 100) * currentVideo.duration;
            }
        });

        // 监听视频进度
        currentVideo.addEventListener('timeupdate', () => {
            if (currentVideo.duration) {
                progressBar.value = (currentVideo.currentTime / currentVideo.duration) * 100;
            }
        });
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }

        screen.orientation.unlock();
        
        const controls = document.getElementById('videoAssistantControls');
        if (controls) {
            controls.remove();
        }
        
        isFullscreen = false;
    }

    function showSpeedMenu() {
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 10px;
            border-radius: 10px;
            z-index: 1000002;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        playRates.forEach(rate => {
            const button = document.createElement('button');
            button.textContent = rate + 'x';
            button.style.cssText = `
                background: ${rate === currentPlayRate ? '#2196F3' : 'transparent'};
                color: white;
                border: 1px solid white;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
            `;
            button.addEventListener('click', () => {
                currentPlayRate = rate;
                if (currentVideo) {
                    currentVideo.playbackRate = rate;
                }
                updateSpeedDisplay();
                menu.remove();
            });
            menu.appendChild(button);
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    function showAspectMenu() {
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 10px;
            border-radius: 10px;
            z-index: 1000002;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;

        aspectModes.forEach(mode => {
            const button = document.createElement('button');
            button.textContent = mode;
            button.style.cssText = `
                background: ${mode === currentAspectMode ? '#2196F3' : 'transparent'};
                color: white;
                border: 1px solid white;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
            `;
            button.addEventListener('click', () => {
                currentAspectMode = mode;
                applyAspectMode(mode);
                updateAspectDisplay();
                menu.remove();
            });
            menu.appendChild(button);
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    function applyAspectMode(mode) {
        if (!currentVideo) return;

        switch(mode) {
            case '原始':
                currentVideo.style.objectFit = 'none';
                break;
            case '适应':
                currentVideo.style.objectFit = 'contain';
                break;
            case '拉伸':
                currentVideo.style.objectFit = 'fill';
                break;
            case '填充':
                currentVideo.style.objectFit = 'cover';
                break;
        }
    }

    function updateSpeedDisplay() {
        const speedDisplay = document.getElementById('speedDisplay');
        if (speedDisplay) {
            speedDisplay.textContent = currentPlayRate;
        }
    }

    function updateAspectDisplay() {
        const aspectDisplay = document.getElementById('aspectDisplay');
        if (aspectDisplay) {
            aspectDisplay.textContent = currentAspectMode;
        }
    }

    function checkVideoElements() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            if (!video.dataset.assistantAttached) {
                video.dataset.assistantAttached = 'true';
                
                video.addEventListener('play', function() {
                    currentVideo = this;
                    createFloatingButton();
                    createControlPanel();
                });

                video.addEventListener('pause', function() {
                    if (this === currentVideo) {
                        // 可以在这里添加暂停时的逻辑
                    }
                });

                video.addEventListener('ended', function() {
                    if (this === currentVideo) {
                        if (floatingButton) {
                            floatingButton.style.display = 'none';
                        }
                        if (isFullscreen) {
                            exitFullscreen();
                        }
                    }
                });
            }
        });
    }

    // 监听DOM变化，检测新出现的视频元素
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                    setTimeout(checkVideoElements, 100);
                }
            });
        });
    });

    // 页面加载完成后初始化
    function init() {
        checkVideoElements();
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 监听全屏变化
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement && isFullscreen) {
            exitFullscreen();
        }
    });

    document.addEventListener('webkitfullscreenchange', function() {
        if (!document.webkitFullscreenElement && isFullscreen) {
            exitFullscreen();
        }
    });

})();
