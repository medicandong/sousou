// ==UserScript==
// @name         手机Edge视频全屏助手-沉浸版
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  解决状态栏显示和侧滑返回问题，实现沉浸式全屏
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 尝试设置视口meta标签，有助于全屏体验 (这个不一定生效，但值得一试)
    function setupViewportMeta() {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            document.head.appendChild(meta);
        }
        // 尝试设置一些有利于全屏的属性
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }

    // 全屏API兼容性处理
    const fullscreenAPI = {
        request: function(element) {
            // 推荐尝试传入选项，但注意浏览器支持度
            // 某些浏览器环境下，全屏API调用可能可以自动隐藏UI[citation:1]
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

    let currentVideo = null;
    let isFullscreen = false;

    // 修改进入全屏的函数
    async function enterFullscreen() {
        if (!currentVideo) return;
        
        try {
            // 优先使用标准全屏API，这更可能触发浏览器自身的沉浸逻辑
            await fullscreenAPI.request(currentVideo);
            // 注意：这里不再需要手动添加全屏样式类，因为浏览器会管理全屏元素的样式
            
            // 横屏逻辑保持不变
            if (shouldUseLandscape(currentVideo) && orientationAPI.isSupported) {
                try {
                    await orientationAPI.lock('landscape');
                } catch (e) {
                    console.log('横屏锁定失败，但不影响全屏:', e);
                }
            }
            
            // 显示我们自定义的控制栏
            document.getElementById('fullscreenControls').style.display = 'flex';
            document.getElementById('videoAssistantBtn').style.display = 'none';
            
            // 关键：尝试拦截全屏下的触摸手势，防止与系统返回冲突
            preventSwipeBackInFullscreen(true);
            
            updateProgress();
            
        } catch (error) {
            console.error('进入标准全屏失败，尝试备用方案:', error);
            // 备用方案：使用之前的固定定位全屏
            await enterFallbackFullscreen();
        }
    }

    // 备用全屏方案（如果标准API失败）
    async function enterFallbackFullscreen() {
        if (!currentVideo) return;
        
        // 保存原始状态
        // ... (同之前代码)
        
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
        
        // 尝试隐藏页面其他内容
        document.body.classList.add('video-fullscreen-active');
        
        // 显示控制栏
        document.getElementById('fullscreenControls').style.display = 'flex';
        document.getElementById('videoAssistantBtn').style.display = 'none';
        
        isFullscreen = true;
        
        // 横屏逻辑
        if (shouldUseLandscape(currentVideo) && orientationAPI.isSupported) {
            try {
                await orientationAPI.lock('landscape');
            } catch (e) {
                console.log('横屏锁定失败:', e);
            }
        }
        
        // 拦截手势
        preventSwipeBackInFullscreen(true);
        updateProgress();
    }

    // 拦截全屏下的滑动返回手势
    function preventSwipeBackInFullscreen(enable) {
        if (!currentVideo) return;
        
        if (enable) {
            // 添加触摸开始事件监听器，阻止默认行为
            currentVideo.addEventListener('touchstart', handleTouchStart, { passive: false });
            currentVideo.addEventListener('touchmove', handleTouchMove, { passive: false });
            console.log('已启用全屏手势拦截');
        } else {
            currentVideo.removeEventListener('touchstart', handleTouchStart);
            currentVideo.removeEventListener('touchmove', handleTouchMove);
            console.log('已禁用全屏手势拦截');
        }
    }

    let startX = 0;
    let startY = 0;

    function handleTouchStart(e) {
        // 记录触摸起点
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        if (!isFullscreen) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        // 如果主要是水平滑动，且在屏幕边缘，则阻止事件
        // 这可以防止系统级的边缘返回手势
        if (Math.abs(deltaX) > Math.abs(deltaY) && startX < 50) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // 修改退出全屏函数
    async function exitFullscreen() {
        try {
            // 先恢复手势
            preventSwipeBackInFullscreen(false);
            
            // 尝试使用标准API退出
            await fullscreenAPI.exit();
        } catch (error) {
            console.error('标准退出全屏失败，使用备用方案:', error);
            // 备用退出方案
            await exitFallbackFullscreen();
        }
    }

    // 备用退出方案
    async function exitFallbackFullscreen() {
        // 恢复手势
        preventSwipeBackInFullscreen(false);
        
        // 移除全屏样式
        document.body.classList.remove('video-fullscreen-active');
        if (currentVideo) {
            currentVideo.classList.remove('video-fullscreen-mode');
            // ... 恢复原始样式 (同之前代码)
        }
        
        // 隐藏控制栏
        document.getElementById('fullscreenControls').style.display = 'none';
        document.getElementById('videoAssistantBtn').style.display = 'flex';
        
        // 解锁屏幕方向
        if (orientationAPI.isSupported) {
            try {
                await orientationAPI.unlock();
            } catch (e) {
                console.log('屏幕方向解锁失败:', e);
            }
        }
        
        isFullscreen = false;
    }

    // 修改全屏变化事件处理
    function handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement || 
                                document.webkitFullscreenElement ||
                                document.mozFullScreenElement ||
                                document.msFullscreenElement;
        
        const wasFullscreen = isFullscreen;
        isFullscreen = !!fullscreenElement;
        
        if (wasFullscreen && !isFullscreen) {
            // 全屏退出后的清理
            preventSwipeBackInFullscreen(false);
            document.getElementById('fullscreenControls').style.display = 'none';
            document.getElementById('videoAssistantBtn').style.display = 'flex';
            if (currentVideo) {
                currentVideo.classList.remove('video-fullscreen');
            }
        }
    }

    // 初始化
    function init() {
        setupViewportMeta();
        // ... 其余初始化代码 (创建悬浮按钮、事件监听等)
        
        console.log('手机Edge视频全屏助手-沉浸版已加载');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
