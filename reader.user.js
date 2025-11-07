// ==UserScript==
// @name         小说阅读助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  通用小说阅读助手，支持翻页、繁简体切换、自动阅读等功能
// @author       Novel Reader
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        autoScrollSpeed: [0.5, 1, 1.5, 2, 2.5, 3], // 自动滚动速度
        fontSize: [12, 14, 16, 18, 20, 22, 24], // 字体大小
        lineHeight: [1.2, 1.4, 1.6, 1.8, 2.0], // 行高
        theme: ['light', 'dark', 'sepia'] // 主题
    };

    // 检测是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // 全局变量
    let floatingButton = null;
    let controlPanel = null;
    let isReadingMode = false;
    let autoScrollInterval = null;
    let currentScrollSpeed = 1;
    let isTraditionalToSimplified = false;

    // 初始化
    function init() {
        console.log('小说阅读助手初始化');
        
        // 加载用户设置
        loadUserSettings();
        
        // 监听页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupReader);
        } else {
            setupReader();
        }
    }

    // 加载用户设置
    function loadUserSettings() {
        const settings = GM_getValue('novelReaderSettings', {
            fontSize: 16,
            lineHeight: 1.6,
            theme: 'light',
            autoScrollSpeed: 1,
            traditionalToSimplified: false
        });
        
        currentScrollSpeed = settings.autoScrollSpeed;
        isTraditionalToSimplified = settings.traditionalToSimplified;
        
        // 应用设置
        applyReaderSettings(settings);
    }

    // 保存用户设置
    function saveUserSettings(settings) {
        GM_setValue('novelReaderSettings', settings);
    }

    // 应用阅读器设置
    function applyReaderSettings(settings) {
        const style = document.getElementById('novel-reader-styles') || document.createElement('style');
        style.id = 'novel-reader-styles';
        
        style.textContent = `
            .novel-reader-mode body {
                font-size: ${settings.fontSize}px !important;
                line-height: ${settings.lineHeight} !important;
                background-color: ${getThemeBackground(settings.theme)} !important;
                color: ${getThemeTextColor(settings.theme)} !important;
            }
            
            .novel-reader-mode * {
                max-width: 100% !important;
            }
            
            .novel-reader-content {
                max-width: 800px !important;
                margin: 0 auto !important;
                padding: 20px !important;
            }
        `;
        
        document.head.appendChild(style);
    }

    // 获取主题背景色
    function getThemeBackground(theme) {
        switch(theme) {
            case 'dark': return '#1a1a1a';
            case 'sepia': return '#f4ecd8';
            default: return '#ffffff';
        }
    }

    // 获取主题文字颜色
    function getThemeTextColor(theme) {
        switch(theme) {
            case 'dark': return '#e0e0e0';
            case 'sepia': return '#5c4b37';
            default: return '#333333';
        }
    }

    // 设置阅读器
    function setupReader() {
        // 检测是否为小说页面
        if (isNovelPage()) {
            showFloatingButton();
        }
    }

    // 检测是否为小说页面
    function isNovelPage() {
        const textContent = document.body.textContent || '';
        const novelKeywords = ['小说', '章节', '正文', '第', '章', 'novel', 'chapter'];
        
        // 检查页面是否包含小说相关关键词
        const hasNovelContent = novelKeywords.some(keyword => 
            textContent.includes(keyword)
        );
        
        // 检查是否有章节导航
        const hasChapterNav = document.querySelector('a[href*="chapter"], a[href*="章节"], .chapter-nav, .prev-next');
        
        return hasNovelContent || hasChapterNav;
    }

    // 显示悬浮按钮
    function showFloatingButton() {
        if (floatingButton) {
            floatingButton.style.display = 'flex';
            return;
        }

        floatingButton = document.createElement('div');
        floatingButton.innerHTML = `
            <span>阅</span>
        `;

        // 根据设备类型调整按钮大小和位置
        const isMobile = isMobileDevice();
        const buttonSize = isMobile ? 60 : 50;
        const buttonBottom = isMobile ? 80 : 100;
        const buttonRight = isMobile ? 15 : 20;
        const fontSize = isMobile ? 22 : 18;

        floatingButton.style.cssText = `
            position: fixed;
            bottom: ${buttonBottom}px;
            right: ${buttonRight}px;
            width: ${buttonSize}px;
            height: ${buttonSize}px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            color: white;
            font-size: ${fontSize}px;
            font-weight: bold;
            font-family: 'Microsoft YaHei', sans-serif;
            user-select: none;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        `;

        floatingButton.addEventListener('mouseenter', () => {
            if (!isMobile) {
                floatingButton.style.transform = 'scale(1.1)';
                floatingButton.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
            }
        });

        floatingButton.addEventListener('mouseleave', () => {
            if (!isMobile) {
                floatingButton.style.transform = 'scale(1)';
                floatingButton.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
            }
        });

        floatingButton.addEventListener('click', showControlPanel);
        floatingButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // 添加触摸反馈
            floatingButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                floatingButton.style.transform = 'scale(1)';
            }, 150);
            showControlPanel();
        });

        document.body.appendChild(floatingButton);
    }

    // 隐藏悬浮按钮
    function hideFloatingButton() {
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
    }

    // 显示控制面板
    function showControlPanel() {
        if (controlPanel) {
            controlPanel.style.display = 'block';
            return;
        }

        controlPanel = document.createElement('div');
        controlPanel.innerHTML = `
            <div class="control-panel-content">
                <div class="control-section">
                    <div class="section-title">阅读模式</div>
                    <div class="control-item" data-action="toggle-reading">
                        <span>${isReadingMode ? '退出阅读模式' : '进入阅读模式'}</span>
                    </div>
                </div>
                
                <div class="control-section">
                    <div class="section-title">翻页控制</div>
                    <div class="control-item" data-action="prev-chapter">
                        <span>上一章</span>
                    </div>
                    <div class="control-item" data-action="next-chapter">
                        <span>下一章</span>
                    </div>
                    <div class="control-item" data-action="show-toc">
                        <span>目录</span>
                    </div>
                </div>
                
                <div class="control-section">
                    <div class="section-title">自动阅读</div>
                    <div class="control-item" data-action="auto-scroll">
                        <span>${autoScrollInterval ? '停止自动' : '开始自动'}</span>
                    </div>
                    <div class="control-item" data-action="speed-control">
                        <span>速度: ${currentScrollSpeed}x</span>
                    </div>
                </div>
                
                <div class="control-section">
                    <div class="section-title">显示设置</div>
                    <div class="control-item" data-action="font-size">
                        <span>字体大小</span>
                    </div>
                    <div class="control-item" data-action="line-height">
                        <span>行高</span>
                    </div>
                    <div class="control-item" data-action="theme">
                        <span>主题</span>
                    </div>
                    <div class="control-item" data-action="toggle-traditional">
                        <span>${isTraditionalToSimplified ? '简体' : '繁体'}</span>
                    </div>
                </div>
            </div>
        `;

        // 根据设备类型调整控制面板样式
        const isMobile = isMobileDevice();
        const panelBottom = isMobile ? 150 : 160;
        const panelRight = isMobile ? 10 : 20;
        const panelMinWidth = isMobile ? 'calc(100vw - 40px)' : '200px';
        const panelMaxWidth = isMobile ? 'calc(100vw - 40px)' : '300px';
        const panelMaxHeight = isMobile ? '60vh' : '400px';
        const itemPadding = isMobile ? '16px 20px' : '12px 16px';
        const itemFontSize = isMobile ? '16px' : '14px';

        controlPanel.style.cssText = `
            position: fixed;
            bottom: ${panelBottom}px;
            right: ${panelRight}px;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 16px 0;
            z-index: 10001;
            min-width: ${panelMinWidth};
            max-width: ${panelMaxWidth};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: block;
            border: 1px solid rgba(0, 0, 0, 0.1);
            max-height: ${panelMaxHeight};
            overflow-y: auto;
            touch-action: manipulation;
            -webkit-overflow-scrolling: touch;
        `;

        const content = controlPanel.querySelector('.control-panel-content');
        content.style.cssText = `
            color: #333;
            font-size: 14px;
        `;

        // 样式控制部分
        const sections = controlPanel.querySelectorAll('.control-section');
        sections.forEach(section => {
            section.style.cssText = `
                margin-bottom: 12px;
            `;
            
            const title = section.querySelector('.section-title');
            title.style.cssText = `
                padding: 8px 16px;
                font-size: 12px;
                color: #666;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
        });

        const controlItems = controlPanel.querySelectorAll('.control-item');
        controlItems.forEach(item => {
            const itemPadding = isMobile ? '16px 20px' : '12px 16px';
            const itemFontSize = isMobile ? '16px' : '14px';
            const itemMinHeight = isMobile ? '48px' : 'auto';
            
            item.style.cssText = `
                padding: ${itemPadding};
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: ${itemFontSize};
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: ${itemMinHeight};
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            `;
            
            // 鼠标悬停效果（仅非移动设备）
            if (!isMobile) {
                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(102, 126, 234, 0.1)';
                    item.style.color = '#667eea';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                    item.style.color = '#333';
                });
            }
            
            // 点击事件
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                handleControlAction(item.getAttribute('data-action'));
            });
            
            // 触摸事件（移动设备优化）
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 添加触摸反馈
                item.style.background = 'rgba(102, 126, 234, 0.15)';
                setTimeout(() => {
                    item.style.background = 'transparent';
                }, 200);
                handleControlAction(item.getAttribute('data-action'));
            });
        });

        // 移除最后一个项目的边框
        const lastItems = controlPanel.querySelectorAll('.control-section .control-item:last-child');
        lastItems.forEach(item => {
            item.style.borderBottom = 'none';
        });

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
            case 'toggle-reading':
                toggleReadingMode();
                break;
            case 'prev-chapter':
                navigateToPrevChapter();
                break;
            case 'next-chapter':
                navigateToNextChapter();
                break;
            case 'show-toc':
                showTableOfContents();
                break;
            case 'auto-scroll':
                toggleAutoScroll();
                break;
            case 'speed-control':
                showSpeedSelector();
                break;
            case 'font-size':
                showFontSizeSelector();
                break;
            case 'line-height':
                showLineHeightSelector();
                break;
            case 'theme':
                showThemeSelector();
                break;
            case 'toggle-traditional':
                toggleTraditionalSimplified();
                break;
        }
        hideControlPanel();
    }

    // 切换阅读模式
    function toggleReadingMode() {
        isReadingMode = !isReadingMode;
        
        if (isReadingMode) {
            enterReadingMode();
        } else {
            exitReadingMode();
        }
        
        // 更新控制面板
        if (controlPanel) {
            const toggleItem = controlPanel.querySelector('[data-action="toggle-reading"] span');
            if (toggleItem) {
                toggleItem.textContent = isReadingMode ? '退出阅读模式' : '进入阅读模式';
            }
        }
    }

    // 进入阅读模式
    function enterReadingMode() {
        document.documentElement.classList.add('novel-reader-mode');
        
        // 提取主要内容
        const content = extractMainContent();
        if (content) {
            content.classList.add('novel-reader-content');
        }
        
        // 隐藏干扰元素
        hideDistractingElements();
    }

    // 退出阅读模式
    function exitReadingMode() {
        document.documentElement.classList.remove('novel-reader-mode');
        
        // 显示隐藏的元素
        showDistractingElements();
    }

    // 提取主要内容
    function extractMainContent() {
        // 常见的小说内容选择器
        const contentSelectors = [
            '.content', '.chapter-content', '.novel-content',
            '.article-content', '.text-content', '#content',
            '.read-content', '.chapter-text', '.article-text'
        ];
        
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 500) {
                return element;
            }
        }
        
        // 如果没有找到明确的内容区域，使用body
        return document.body;
    }

    // 隐藏干扰元素
    function hideDistractingElements() {
        const distractingSelectors = [
            'header', 'footer', 'nav', '.header', '.footer', '.nav',
            '.advertisement', '.ad', '.sidebar', '.comment',
            '.social-share', '.related-posts'
        ];
        
        distractingSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    // 显示干扰元素
    function showDistractingElements() {
        const distractingSelectors = [
            'header', 'footer', 'nav', '.header', '.footer', '.nav',
            '.advertisement', '.ad', '.sidebar', '.comment',
            '.social-share', '.related-posts'
        ];
        
        distractingSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = '';
            });
        });
    }

    // 导航到上一章
    function navigateToPrevChapter() {
        const prevLinks = [
            document.querySelector('a[href*="prev"]'),
            document.querySelector('a[href*="上一"]'),
            document.querySelector('a[href*="前"]'),
            document.querySelector('.prev-chapter'),
            document.querySelector('.chapter-prev')
        ].filter(link => link);
        
        if (prevLinks.length > 0) {
            prevLinks[0].click();
        } else {
            alert('未找到上一章链接');
        }
    }

    // 导航到下一章
    function navigateToNextChapter() {
        const nextLinks = [
            document.querySelector('a[href*="next"]'),
            document.querySelector('a[href*="下一"]'),
            document.querySelector('a[href*="后"]'),
            document.querySelector('.next-chapter'),
            document.querySelector('.chapter-next')
        ].filter(link => link);
        
        if (nextLinks.length > 0) {
            nextLinks[0].click();
        } else {
            alert('未找到下一章链接');
        }
    }

    // 显示目录
    function showTableOfContents() {
        const tocLinks = [
            document.querySelector('a[href*="toc"]'),
            document.querySelector('a[href*="目录"]'),
            document.querySelector('a[href*="chapter"]'),
            document.querySelector('.toc'),
            document.querySelector('.chapter-list')
        ].filter(link => link);
        
        if (tocLinks.length > 0) {
            tocLinks[0].click();
        } else {
            alert('未找到目录链接');
        }
    }

    // 切换自动滚动
    function toggleAutoScroll() {
        if (autoScrollInterval) {
            stopAutoScroll();
        } else {
            startAutoScroll();
        }
        
        // 更新控制面板
        if (controlPanel) {
            const autoItem = controlPanel.querySelector('[data-action="auto-scroll"] span');
            if (autoItem) {
                autoItem.textContent = autoScrollInterval ? '停止自动' : '开始自动';
            }
        }
    }

    // 开始自动滚动
    function startAutoScroll() {
        const speed = 50 / currentScrollSpeed; // 速度越快，间隔越小
        
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, 1);
            
            // 检查是否到达页面底部
            if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 10) {
                // 到达底部，尝试翻页
                navigateToNextChapter();
                stopAutoScroll();
            }
        }, speed);
    }

    // 停止自动滚动
    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }

    // 显示速度选择器
    function showSpeedSelector() {
        let selector = document.getElementById('speed-selector');
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        selector = document.createElement('div');
        selector.id = 'speed-selector';
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>滚动速度</span>
                </div>
                <div class="selector-options">
                    ${CONFIG.autoScrollSpeed.map(speed => `
                        <div class="option" data-speed="${speed}">
                            <span>${speed}x</span>
                            ${speed === currentScrollSpeed ? '<span class="selected">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 0;
            z-index: 10002;
            min-width: 150px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;

        const content = selector.querySelector('.selector-content');
        content.style.cssText = `
            color: #333;
        `;

        const header = selector.querySelector('.selector-header');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-weight: bold;
            font-size: 16px;
            text-align: center;
        `;

        const options = selector.querySelector('.selector-options');
        options.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
        `;

        const optionElements = selector.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(102, 126, 234, 0.1)';
            });

            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(option.getAttribute('data-speed'));
                currentScrollSpeed = speed;
                
                // 更新设置
                const settings = GM_getValue('novelReaderSettings', {});
                settings.autoScrollSpeed = speed;
                saveUserSettings(settings);
                
                // 更新控制面板显示
                if (controlPanel) {
                    const speedItem = controlPanel.querySelector('[data-action="speed-control"] span');
                    if (speedItem) {
                        speedItem.textContent = `速度: ${speed}x`;
                    }
                }
                
                selector.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        optionElements[optionElements.length - 1].style.borderBottom = 'none';

        document.body.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target)) {
                    selector.style.display = 'none';
                }
            }, { once: true });
        }, 100);
    }

    // 显示字体大小选择器
    function showFontSizeSelector() {
        let selector = document.getElementById('font-size-selector');
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        const settings = GM_getValue('novelReaderSettings', {});
        const currentSize = settings.fontSize || 16;

        selector = document.createElement('div');
        selector.id = 'font-size-selector';
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>字体大小</span>
                </div>
                <div class="selector-options">
                    ${CONFIG.fontSize.map(size => `
                        <div class="option" data-size="${size}">
                            <span style="font-size: ${size}px">示例文字</span>
                            ${size === currentSize ? '<span class="selected">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 0;
            z-index: 10002;
            min-width: 180px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;

        const content = selector.querySelector('.selector-content');
        content.style.cssText = `
            color: #333;
        `;

        const header = selector.querySelector('.selector-header');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-weight: bold;
            font-size: 16px;
            text-align: center;
        `;

        const options = selector.querySelector('.selector-options');
        options.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
        `;

        const optionElements = selector.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(102, 126, 234, 0.1)';
            });

            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = parseInt(option.getAttribute('data-size'));
                
                // 更新设置
                const settings = GM_getValue('novelReaderSettings', {});
                settings.fontSize = size;
                saveUserSettings(settings);
                applyReaderSettings(settings);
                
                selector.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        optionElements[optionElements.length - 1].style.borderBottom = 'none';

        document.body.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target)) {
                    selector.style.display = 'none';
                }
            }, { once: true });
        }, 100);
    }

    // 显示行高选择器
    function showLineHeightSelector() {
        let selector = document.getElementById('line-height-selector');
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        const settings = GM_getValue('novelReaderSettings', {});
        const currentHeight = settings.lineHeight || 1.6;

        selector = document.createElement('div');
        selector.id = 'line-height-selector';
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>行高</span>
                </div>
                <div class="selector-options">
                    ${CONFIG.lineHeight.map(height => `
                        <div class="option" data-height="${height}">
                            <span style="line-height: ${height}">示例文字<br>第二行</span>
                            ${height === currentHeight ? '<span class="selected">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 0;
            z-index: 10002;
            min-width: 150px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;

        const content = selector.querySelector('.selector-content');
        content.style.cssText = `
            color: #333;
        `;

        const header = selector.querySelector('.selector-header');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-weight: bold;
            font-size: 16px;
            text-align: center;
        `;

        const options = selector.querySelector('.selector-options');
        options.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
        `;

        const optionElements = selector.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(102, 126, 234, 0.1)';
            });

            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const height = parseFloat(option.getAttribute('data-height'));
                
                // 更新设置
                const settings = GM_getValue('novelReaderSettings', {});
                settings.lineHeight = height;
                saveUserSettings(settings);
                applyReaderSettings(settings);
                
                selector.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        optionElements[optionElements.length - 1].style.borderBottom = 'none';

        document.body.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target)) {
                    selector.style.display = 'none';
                }
            }, { once: true });
        }, 100);
    }

    // 显示主题选择器
    function showThemeSelector() {
        let selector = document.getElementById('theme-selector');
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        const settings = GM_getValue('novelReaderSettings', {});
        const currentTheme = settings.theme || 'light';

        selector = document.createElement('div');
        selector.id = 'theme-selector';
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>主题</span>
                </div>
                <div class="selector-options">
                    ${CONFIG.theme.map(theme => `
                        <div class="option" data-theme="${theme}">
                            <span>${getThemeName(theme)}</span>
                            ${theme === currentTheme ? '<span class="selected">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 0;
            z-index: 10002;
            min-width: 120px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0, 0, 0, 0.1);
        `;

        const content = selector.querySelector('.selector-content');
        content.style.cssText = `
            color: #333;
        `;

        const header = selector.querySelector('.selector-header');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            font-weight: bold;
            font-size: 16px;
            text-align: center;
        `;

        const options = selector.querySelector('.selector-options');
        options.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
        `;

        const optionElements = selector.querySelectorAll('.option');
        optionElements.forEach(option => {
            option.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            option.addEventListener('mouseenter', () => {
                option.style.background = 'rgba(102, 126, 234, 0.1)';
            });

            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = option.getAttribute('data-theme');
                
                // 更新设置
                const settings = GM_getValue('novelReaderSettings', {});
                settings.theme = theme;
                saveUserSettings(settings);
                applyReaderSettings(settings);
                
                selector.style.display = 'none';
            });
        });

        // 移除最后一个选项的边框
        optionElements[optionElements.length - 1].style.borderBottom = 'none';

        document.body.appendChild(selector);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!selector.contains(e.target)) {
                    selector.style.display = 'none';
                }
            }, { once: true });
        }, 100);
    }

    // 获取主题名称
    function getThemeName(theme) {
        switch(theme) {
            case 'light': return '浅色';
            case 'dark': return '深色';
            case 'sepia': return '护眼';
            default: return theme;
        }
    }

    // 切换繁简体
    function toggleTraditionalSimplified() {
        isTraditionalToSimplified = !isTraditionalToSimplified;
        
        // 更新设置
        const settings = GM_getValue('novelReaderSettings', {});
        settings.traditionalToSimplified = isTraditionalToSimplified;
        saveUserSettings(settings);
        
        // 更新控制面板显示
        if (controlPanel) {
            const toggleItem = controlPanel.querySelector('[data-action="toggle-traditional"] span');
            if (toggleItem) {
                toggleItem.textContent = isTraditionalToSimplified ? '简体' : '繁体';
            }
        }
        
        // 应用繁简体转换
        if (isTraditionalToSimplified) {
            convertTraditionalToSimplified();
        } else {
            // 恢复原始文本（需要重新加载页面或保存原始文本）
            location.reload();
        }
    }

    // 繁体转简体
    function convertTraditionalToSimplified() {
        // 简繁对照表（简化版）
        const traditionalToSimplified = {
            '臺': '台', '灣': '湾', '國': '国', '體': '体', '電': '电',
            '腦': '脑', '網': '网', '絡': '络', '頁': '页', '麵': '面',
            '線': '线', '機': '机', '關': '关', '開': '开', '關': '关',
            '門': '门', '間': '间', '陽': '阳', '陰': '阴', '風': '风',
            '雲': '云', '雨': '雨', '雪': '雪', '雷': '雷', '電': '电'
            // 这里应该包含完整的简繁对照表，但为了简洁只列出一部分
        };
        
        // 转换页面文本
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            let text = node.textContent;
            for (const [traditional, simplified] of Object.entries(traditionalToSimplified)) {
                text = text.replace(new RegExp(traditional, 'g'), simplified);
            }
            node.textContent = text;
        }
    }

    // 启动脚本
    init();
})();
