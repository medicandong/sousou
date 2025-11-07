// ==UserScript==
// @name         小说阅读助手增强版
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  基于VIA浏览器阅读模式理念优化的通用小说阅读助手
// @author       Novel Reader Enhanced
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 增强配置
    const CONFIG = {
        autoScrollSpeed: [0.5, 1, 1.5, 2, 2.5, 3],
        fontSize: [12, 14, 16, 18, 20, 22, 24, 26, 28],
        lineHeight: [1.2, 1.4, 1.6, 1.8, 2.0, 2.2],
        theme: ['light', 'dark', 'sepia', 'green'],
        margin: [0, 10, 20, 30, 40, 50],
        contentWidth: [600, 700, 800, 900, 1000, 1200]
    };

    // 全局状态
    let floatingButton = null;
    let controlPanel = null;
    let isReadingMode = false;
    let autoScrollInterval = null;
    let currentScrollSpeed = 1;
    let isTraditionalToSimplified = false;
    let originalBodyContent = null;
    let enhancedContent = null;
    let pageState = {
        currentUrl: window.location.href,
        scrollPosition: 0,
        readingModeActive: false
    };

    // 智能页面检测器
    const PageDetector = {
        // 小说网站特征库
        novelSites: [
            // 中文小说网站
            'qidian.com', 'zongheng.com', '17k.com', 'hongxiu.com',
            'xxsy.net', 'jinjiang.com', 'booktxt.net', 'biquge.com',
            'x23us.com', 'dingdiann.com', 'shuquge.com', 'biquku.com',
            // 英文小说网站
            'wattpad.com', 'royalroad.com', 'webnovel.com', 'novelupdates.com'
        ],

        // 小说内容特征
        contentPatterns: [
            /第[零一二三四五六七八九十百千]+章/,
            /chapter\s+\d+/i,
            /[上下]?一?[章节回]/,
            /正文开始|正文内容|小说内容/,
            /novel|chapter|volume/i
        ],

        // 章节导航特征
        navPatterns: [
            /上一[章节回]|下一[章节回]/,
            /prev|next/i,
            /chapter.*nav|nav.*chapter/i,
            /目录|章节列表|table of contents/i
        ],

        // 检测是否为小说页面
        isNovelPage() {
            const url = window.location.href.toLowerCase();
            const domain = window.location.hostname.toLowerCase();
            
            // 1. 检查域名是否匹配已知小说网站
            if (this.novelSites.some(site => domain.includes(site))) {
                return true;
            }

            // 2. 检查URL路径特征
            const path = window.location.pathname.toLowerCase();
            if (path.includes('/chapter/') || path.includes('/read/') || 
                path.includes('/novel/') || path.includes('/book/')) {
                return true;
            }

            // 3. 检查页面内容特征
            const textContent = document.body.textContent || '';
            const hasNovelKeywords = this.contentPatterns.some(pattern => 
                pattern.test(textContent)
            );

            // 4. 检查章节导航
            const hasChapterNav = this.navPatterns.some(pattern => 
                pattern.test(textContent)
            );

            // 5. 检查是否有章节内容区域
            const hasContentArea = this.findContentArea() !== null;

            return hasNovelKeywords || hasChapterNav || hasContentArea;
        },

        // 智能查找内容区域
        findContentArea() {
            const contentSelectors = [
                // 中文小说网站常用选择器
                '.content', '.chapter-content', '.novel-content', '.read-content',
                '.text-content', '.article-content', '.chapter-text', '.book-content',
                '#content', '#chapter-content', '#novel-content', '#read-content',
                // 英文小说网站常用选择器
                '.chapter', '.chapter-body', '.chapter-content', '.novel-body',
                '.entry-content', '.post-content', '.story-content',
                // 通用选择器
                'article', 'main', '[role="main"]', '.main-content'
            ];

            for (const selector of contentSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || '';
                    if (text.length > 300 && this.isLikelyNovelContent(text)) {
                        return element;
                    }
                }
            }

            // 回退到智能内容提取
            return this.extractIntelligentContent();
        },

        // 判断是否为小说内容
        isLikelyNovelContent(text) {
            const novelIndicators = [
                // 中文小说特征
                /第[零一二三四五六七八九十百千]+章/,
                /[「」『』""""]/, // 对话引号
                /说道|问道|喊道|笑道|心想|觉得/,
                // 英文小说特征
                /chapter\s+\d+/i,
                /said|asked|replied|thought|exclaimed/i,
                /"[^"]*"/ // 英文对话
            ];

            return novelIndicators.some(pattern => pattern.test(text));
        },

        // 智能内容提取（类似VIA浏览器）
        extractIntelligentContent() {
            // 1. 尝试找到最大的文本块
            const paragraphs = Array.from(document.querySelectorAll('p, div, span'))
                .filter(el => {
                    const text = el.textContent || '';
                    return text.length > 50 && !this.isNoiseElement(el);
                })
                .sort((a, b) => (b.textContent.length - a.textContent.length));

            if (paragraphs.length > 0) {
                // 找到连续的段落
                const contentContainer = document.createElement('div');
                contentContainer.className = 'novel-reader-enhanced-content';
                
                let consecutiveCount = 0;
                let lastElement = null;
                
                for (const p of paragraphs.slice(0, 20)) {
                    if (this.isConsecutive(lastElement, p)) {
                        consecutiveCount++;
                        contentContainer.appendChild(p.cloneNode(true));
                    } else if (consecutiveCount < 3) {
                        contentContainer.innerHTML = '';
                        contentContainer.appendChild(p.cloneNode(true));
                        consecutiveCount = 1;
                    }
                    lastElement = p;
                }
                
                if (contentContainer.children.length >= 3) {
                    return contentContainer;
                }
            }

            // 2. 回退到body内容
            return document.body;
        },

        // 判断是否为噪音元素
        isNoiseElement(element) {
            const noiseSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 
                '.ad', '.advertisement', '.sidebar', '.comment',
                '.social-share', '.related-posts', '.menu', '.navigation'
            ];
            
            return noiseSelectors.some(selector => 
                element.matches(selector) || element.closest(selector)
            );
        },

        // 判断元素是否连续
        isConsecutive(prev, current) {
            if (!prev) return true;
            
            const prevRect = prev.getBoundingClientRect();
            const currentRect = current.getBoundingClientRect();
            
            return Math.abs(currentRect.top - (prevRect.top + prevRect.height)) < 50;
        }
    };

    // 章节导航器
    const ChapterNavigator = {
        // 查找章节链接
        findChapterLinks() {
            const links = Array.from(document.querySelectorAll('a[href]'));
            
            const chapterLinks = links.filter(link => {
                const href = link.href.toLowerCase();
                const text = link.textContent.toLowerCase();
                
                // URL特征
                const urlPatterns = [
                    /chapter|chap|ch\.?\/?\d+/i,
                    /第[零一二三四五六七八九十百千]+章/,
                    /\d+\/\d+\.html?/, // 类似 123/456.html
                    /read|novel|book.*\d+/i
                ];
                
                // 文本特征
                const textPatterns = [
                    /上一[章节回]|下一[章节回]/,
                    /第[零一二三四五六七八九十百千]+章/,
                    /chapter\s+\d+/i,
                    /prev|next|previous/i
                ];
                
                const hasUrlPattern = urlPatterns.some(pattern => pattern.test(href));
                const hasTextPattern = textPatterns.some(pattern => pattern.test(text));
                
                return hasUrlPattern || hasTextPattern;
            });
            
            return chapterLinks;
        },

        // 查找上一章链接
        findPrevChapter() {
            const links = this.findChapterLinks();
            const prevKeywords = ['上一', '上一章', '上一节', 'prev', 'previous', '前'];
            
            return links.find(link => {
                const text = link.textContent.toLowerCase();
                return prevKeywords.some(keyword => text.includes(keyword));
            });
        },

        // 查找下一章链接
        findNextChapter() {
            const links = this.findChapterLinks();
            const nextKeywords = ['下一', '下一章', '下一节', 'next', '后'];
            
            return links.find(link => {
                const text = link.textContent.toLowerCase();
                return nextKeywords.some(keyword => text.includes(keyword));
            });
        },

        // 智能导航到章节
        navigateToChapter(direction) {
            const link = direction === 'prev' ? this.findPrevChapter() : this.findNextChapter();
            
            if (link) {
                // 保存当前状态
                this.savePageState();
                
                // 使用平滑过渡
                this.prepareNavigation(() => {
                    link.click();
                });
                
                return true;
            }
            
            return false;
        },

        // 保存页面状态
        savePageState() {
            pageState.currentUrl = window.location.href;
            pageState.scrollPosition = window.pageYOffset;
            pageState.readingModeActive = isReadingMode;
            
            GM_setValue('lastPageState', pageState);
        },

        // 准备导航（平滑过渡）
        prepareNavigation(callback) {
            if (isReadingMode) {
                // 在阅读模式下，先退出阅读模式再导航
                exitReadingMode();
                setTimeout(callback, 100);
            } else {
                callback();
            }
        }
    };

    // 阅读模式管理器
    const ReadingModeManager = {
        // 进入阅读模式
        enter() {
            if (isReadingMode) return;
            
            // 保存原始内容
            this.saveOriginalContent();
            
            // 创建增强内容
            this.createEnhancedContent();
            
            // 应用阅读模式样式
            this.applyReadingMode();
            
            isReadingMode = true;
            this.updateUI();
        },

        // 退出阅读模式
        exit() {
            if (!isReadingMode) return;
            
            // 恢复原始内容
            this.restoreOriginalContent();
            
            // 移除阅读模式样式
            this.removeReadingMode();
            
            isReadingMode = false;
            this.updateUI();
        },

        // 保存原始内容
        saveOriginalContent() {
            originalBodyContent = document.body.innerHTML;
        },

        // 恢复原始内容
        restoreOriginalContent() {
            if (originalBodyContent) {
                document.body.innerHTML = originalBodyContent;
                originalBodyContent = null;
            }
        },

        // 创建增强内容
        createEnhancedContent() {
            const contentArea = PageDetector.findContentArea();
            if (!contentArea) return;

            enhancedContent = contentArea.cloneNode(true);
            enhancedContent.className = 'novel-reader-enhanced-main-content';
            
            // 清空body并添加增强内容
            document.body.innerHTML = '';
            document.body.appendChild(enhancedContent);
            
            // 添加阅读器控制栏
            this.addReaderControls();
        },

        // 添加阅读器控制栏
        addReaderControls() {
            const controls = document.createElement('div');
            controls.className = 'novel-reader-controls';
            controls.innerHTML = `
                <div class="reader-header">
                    <button class="reader-btn" onclick="window.novelReader.exitReadingMode()">退出</button>
                    <button class="reader-btn" onclick="window.novelReader.prevChapter()">上一章</button>
                    <button class="reader-btn" onclick="window.novelReader.nextChapter()">下一章</button>
                    <button class="reader-btn" onclick="window.novelReader.toggleAutoScroll()">
                        ${autoScrollInterval ? '停止' : '自动'}
                    </button>
                </div>
            `;
            
            document.body.insertBefore(controls, enhancedContent);
        },

        // 应用阅读模式样式
        applyReadingMode() {
            const settings = GM_getValue('novelReaderSettings', getDefaultSettings());
            
            const style = document.createElement('style');
            style.id = 'novel-reader-enhanced-styles';
            style.textContent = `
                .novel-reader-enhanced-main-content {
                    max-width: ${settings.contentWidth}px !important;
                    margin: 0 auto !important;
                    padding: ${settings.margin}px 20px !important;
                    font-size: ${settings.fontSize}px !important;
                    line-height: ${settings.lineHeight} !important;
                    background-color: ${getThemeBackground(settings.theme)} !important;
                    color: ${getThemeTextColor(settings.theme)} !important;
                    font-family: ${getFontFamily(settings.theme)} !important;
                    text-align: justify !important;
                }
                
                .novel-reader-controls {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    padding: 10px 20px;
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                }
                
                .reader-btn {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .reader-btn:hover {
                    background: #f5f5f5;
                }
                
                body {
                    margin: 0 !important;
                    padding: 60px 0 0 0 !important;
                    background: ${getThemeBackground(settings.theme)} !important;
                }
            `;
            
            document.head.appendChild(style);
        },

        // 移除阅读模式样式
        removeReadingMode() {
            const style = document.getElementById('novel-reader-enhanced-styles');
            if (style) {
                style.remove();
            }
        },

        // 更新UI状态
        updateUI() {
            if (controlPanel) {
                const toggleItem = controlPanel.querySelector('[data-action="toggle-reading"] span');
                if (toggleItem) {
                    toggleItem.textContent = isReadingMode ? '退出阅读模式' : '进入阅读模式';
                }
            }
        }
    };

    // 工具函数
    function getDefaultSettings() {
        return {
            fontSize: 18,
            lineHeight: 1.8,
            theme: 'light',
            autoScrollSpeed: 1,
            traditionalToSimplified: false,
            margin: 20,
            contentWidth: 800
        };
    }

    function getThemeBackground(theme) {
        switch(theme) {
            case 'dark': return '#1a1a1a';
            case 'sepia': return '#f4ecd8';
            case 'green': return '#e8f5e8';
            default: return '#ffffff';
        }
    }

    function getThemeTextColor(theme) {
        switch(theme) {
            case 'dark': return '#e0e0e0';
            case 'sepia': return '#5c4b37';
            case 'green': return '#2d5016';
            default: return '#333333';
        }
    }

    function getFontFamily(theme) {
        return "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'WenQuanYi Micro Hei', sans-serif";
    }

    // 暴露全局方法供HTML调用
    window.novelReader = {
        exitReadingMode: () => ReadingModeManager.exit(),
        prevChapter: () => ChapterNavigator.navigateToChapter('prev'),
        nextChapter: () => ChapterNavigator.navigateToChapter('next'),
        toggleAutoScroll: () => toggleAutoScroll()
    };

    // 初始化
    function init() {
        console.log('小说阅读助手增强版初始化');
        
        // 加载用户设置
        loadUserSettings();
        
        // 监听页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupReader);
        } else {
            setupReader();
        }
        
        // 注册菜单命令
        registerMenuCommands();
    }

    // 加载用户设置
    function loadUserSettings() {
        const settings = GM_getValue('novelReaderSettings', getDefaultSettings());
        
        currentScrollSpeed = settings.autoScrollSpeed;
        isTraditionalToSimplified = settings.traditionalToSimplified;
    }

    // 保存用户设置
    function saveUserSettings(settings) {
        GM_setValue('novelReaderSettings', settings);
    }

    // 注册菜单命令
    function registerMenuCommands() {
        // 强制启用阅读模式
        GM_registerMenuCommand('强制阅读模式', () => {
            ReadingModeManager.enter();
        });
        
        // 重置设置
        GM_registerMenuCommand('重置设置', () => {
            const defaultSettings = getDefaultSettings();
            saveUserSettings(defaultSettings);
            alert('设置已重置为默认值');
        });
    }

    // 设置阅读器
    function setupReader() {
        // 检测是否为小说页面
        if (PageDetector.isNovelPage()) {
            showFloatingButton();
            
            // 检查是否需要恢复阅读模式
            const lastState = GM_getValue('lastPageState');
            if (lastState && lastState.readingModeActive && 
                lastState.currentUrl === window.location.href) {
                setTimeout(() => {
                    ReadingModeManager.enter();
                    window.scrollTo(0, lastState.scrollPosition);
                }, 500);
            }
        }
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

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
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

        floatingButton.addEventListener('click', showControlPanel);
        document.body.appendChild(floatingButton);
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
                    <div class="section-title">章节导航</div>
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
                    <div class="control-item" data-action="content-width">
                        <span>内容宽度</span>
                    </div>
                    <div class="control-item" data-action="margin">
                        <span>边距</span>
                    </div>
                </div>
            </div>
        `;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        const panelBottom = isMobile ? 150 : 160;
        const panelRight = isMobile ? 10 : 20;

        controlPanel.style.cssText = `
            position: fixed;
            bottom: ${panelBottom}px;
            right: ${panelRight}px;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 16px 0;
            z-index: 10001;
            min-width: ${isMobile ? 'calc(100vw - 40px)' : '200px'};
            max-width: ${isMobile ? 'calc(100vw - 40px)' : '300px'};
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            display: block;
            border: 1px solid rgba(0, 0, 0, 0.1);
            max-height: ${isMobile ? '60vh' : '400px'};
            overflow-y: auto;
        `;

        const controlItems = controlPanel.querySelectorAll('.control-item');
        controlItems.forEach(item => {
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                handleControlAction(item.getAttribute('data-action'));
            });
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
                ChapterNavigator.navigateToChapter('prev');
                break;
            case 'next-chapter':
                ChapterNavigator.navigateToChapter('next');
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
            case 'content-width':
                showContentWidthSelector();
                break;
            case 'margin':
                showMarginSelector();
                break;
        }
        hideControlPanel();
    }

    // 切换阅读模式
    function toggleReadingMode() {
        if (isReadingMode) {
            ReadingModeManager.exit();
        } else {
            ReadingModeManager.enter();
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
    }

    // 开始自动滚动
    function startAutoScroll() {
        const speed = 50 / currentScrollSpeed;
        
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, 1);
            
            // 检查是否到达页面底部
            if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 10) {
                // 到达底部，尝试翻页
                if (ChapterNavigator.navigateToChapter('next')) {
                    stopAutoScroll();
                }
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
        showGenericSelector('speed', CONFIG.autoScrollSpeed, currentScrollSpeed, (speed) => {
            currentScrollSpeed = speed;
            const settings = GM_getValue('novelReaderSettings', {});
            settings.autoScrollSpeed = speed;
            saveUserSettings(settings);
        });
    }

    // 显示字体大小选择器
    function showFontSizeSelector() {
        const settings = GM_getValue('novelReaderSettings', {});
        const currentSize = settings.fontSize || 18;
        
        showGenericSelector('font-size', CONFIG.fontSize, currentSize, (size) => {
            const settings = GM_getValue('novelReaderSettings', {});
            settings.fontSize = size;
            saveUserSettings(settings);
            if (isReadingMode) {
                ReadingModeManager.applyReadingMode();
            }
        });
    }

    // 显示行高选择器
    function showLineHeightSelector() {
        const settings = GM_getValue('novelReaderSettings', {});
        const currentHeight = settings.lineHeight || 1.8;
        
        showGenericSelector('line-height', CONFIG.lineHeight, currentHeight, (height) => {
            const settings = GM_getValue('novelReaderSettings', {});
            settings.lineHeight = height;
            saveUserSettings(settings);
            if (isReadingMode) {
                ReadingModeManager.applyReadingMode();
            }
        });
    }

    // 显示主题选择器
    function showThemeSelector() {
        const settings = GM_getValue('novelReaderSettings', {});
        const currentTheme = settings.theme || 'light';
        
        showGenericSelector('theme', CONFIG.theme, currentTheme, (theme) => {
            const settings = GM_getValue('novelReaderSettings', {});
            settings.theme = theme;
            saveUserSettings(settings);
            if (isReadingMode) {
                ReadingModeManager.applyReadingMode();
            }
        });
    }

    // 显示内容宽度选择器
    function showContentWidthSelector() {
        const settings = GM_getValue('novelReaderSettings', {});
        const currentWidth = settings.contentWidth || 800;
        
        showGenericSelector('content-width', CONFIG.contentWidth, currentWidth, (width) => {
            const settings = GM_getValue('novelReaderSettings', {});
            settings.contentWidth = width;
            saveUserSettings(settings);
            if (isReadingMode) {
                ReadingModeManager.applyReadingMode();
            }
        });
    }

    // 显示边距选择器
    function showMarginSelector() {
        const settings = GM_getValue('novelReaderSettings', {});
        const currentMargin = settings.margin || 20;
        
        showGenericSelector('margin', CONFIG.margin, currentMargin, (margin) => {
            const settings = GM_getValue('novelReaderSettings', {});
            settings.margin = margin;
            saveUserSettings(settings);
            if (isReadingMode) {
                ReadingModeManager.applyReadingMode();
            }
        });
    }

    // 通用选择器显示函数
    function showGenericSelector(type, options, currentValue, callback) {
        let selector = document.getElementById(`${type}-selector`);
        if (selector) {
            selector.style.display = 'flex';
            return;
        }

        const typeNames = {
            'speed': '滚动速度',
            'font-size': '字体大小',
            'line-height': '行高',
            'theme': '主题',
            'content-width': '内容宽度',
            'margin': '边距'
        };

        selector = document.createElement('div');
        selector.id = `${type}-selector`;
        selector.innerHTML = `
            <div class="selector-content">
                <div class="selector-header">
                    <span>${typeNames[type]}</span>
                </div>
                <div class="selector-options">
                    ${options.map(option => `
                        <div class="option" data-value="${option}">
                            <span>${getOptionDisplayText(type, option)}</span>
                            ${option === currentValue ? '<span class="selected">✓</span>' : ''}
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

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = type === 'font-size' || type === 'content-width' || type === 'margin' ? 
                    parseInt(option.getAttribute('data-value')) : 
                    parseFloat(option.getAttribute('data-value'));
                callback(value);
                selector.style.display = 'none';
            });
        });

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

    // 获取选项显示文本
    function getOptionDisplayText(type, value) {
        switch(type) {
            case 'speed':
                return `${value}x`;
            case 'font-size':
                return `${value}px`;
            case 'line-height':
                return value.toString();
            case 'theme':
                return getThemeName(value);
            case 'content-width':
                return `${value}px`;
            case 'margin':
                return `${value}px`;
            default:
                return value.toString();
        }
    }

    // 获取主题名称
    function getThemeName(theme) {
        switch(theme) {
            case 'light': return '浅色';
            case 'dark': return '深色';
            case 'sepia': return '护眼';
            case 'green': return '绿色';
            default: return theme;
        }
    }

    // 启动脚本
    init();
})();
