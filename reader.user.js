// ==UserScript==
// @name         小说阅读助手VIA优化版
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  基于VIA浏览器阅读模式理念深度优化的通用小说阅读助手
// @author       Novel Reader VIA Optimized
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // VIA浏览器风格配置
    const CONFIG = {
        autoScrollSpeed: [0.5, 1, 1.5, 2, 2.5, 3],
        fontSize: [12, 14, 16, 18, 20, 22, 24, 26, 28],
        lineHeight: [1.2, 1.4, 1.6, 1.8, 2.0, 2.2],
        theme: ['light', 'dark', 'sepia', 'green', 'blue'],
        margin: [0, 10, 20, 30, 40, 50],
        contentWidth: [600, 700, 800, 900, 1000, 1200],
        // VIA浏览器特色功能
        enableSmartDetection: true,
        enableAutoChapter: true,
        enableContentExtraction: true,
        enableSmoothNavigation: true
    };

    // 全局状态管理
    let state = {
        floatingButton: null,
        controlPanel: null,
        isReadingMode: false,
        autoScrollInterval: null,
        currentScrollSpeed: 1,
        isTraditionalToSimplified: false,
        originalBodyContent: null,
        enhancedContent: null,
        pageState: {
            currentUrl: window.location.href,
            scrollPosition: 0,
            readingModeActive: false,
            chapterTitle: ''
        },
        // VIA浏览器风格状态
        viaMode: {
            smartDetectionEnabled: true,
            contentExtractionEnabled: true,
            smoothNavigationEnabled: true
        }
    };

    // VIA浏览器风格智能检测器
    const VIAPageDetector = {
        // 扩展的小说网站特征库（基于VIA浏览器数据）
        novelSites: [
            // 中文小说网站
            'qidian.com', 'zongheng.com', '17k.com', 'hongxiu.com',
            'xxsy.net', 'jinjiang.com', 'booktxt.net', 'biquge.com',
            'x23us.com', 'dingdiann.com', 'shuquge.com', 'biquku.com',
            '69shu.com', 'bxwx.org', 'piaotian.com', 'wenku8.net',
            'uukanshu.com', 'shubaow.com', 'daocaorenshuwu.com',
            'novelbuddy.com', 'novelbin.com', 'novelhall.com',
            // 英文小说网站
            'wattpad.com', 'royalroad.com', 'webnovel.com', 'novelupdates.com',
            'scribblehub.com', 'lightnovelpub.com', 'ranobes.net',
            // 轻小说网站
            'linovelib.com', 'wenxue.iqiyi.com', 'book.qidian.com'
        ],

        // VIA浏览器风格内容模式识别
        contentPatterns: [
            /第[零一二三四五六七八九十百千]+章/,
            /chapter\s+\d+/i,
            /[上下]?一?[章节回]/,
            /正文开始|正文内容|小说内容|本章内容/,
            /novel|chapter|volume|story/i,
            /[\u4e00-\u9fa5]{100,}/, // 连续中文文本
            /[。！？]{3,}/ // 多个中文标点
        ],

        // 章节导航模式
        navPatterns: [
            /上一[章节回]|下一[章节回]/,
            /prev|next|previous/i,
            /chapter.*nav|nav.*chapter/i,
            /目录|章节列表|table of contents|toc/i,
            /第.*章.*第.*章/ // 章节链接模式
        ],

        // VIA浏览器风格智能检测（降低阈值，提高兼容性）
        isNovelPage() {
            const url = window.location.href.toLowerCase();
            const domain = window.location.hostname.toLowerCase();
            
            // 1. 宽松的域名匹配
            if (this.novelSites.some(site => domain.includes(site))) {
                console.log('VIA检测: 匹配已知小说网站');
                return true;
            }

            // 2. 宽松的URL路径匹配
            const path = window.location.pathname.toLowerCase();
            const urlPatterns = [
                '/chapter/', '/read/', '/novel/', '/book/', '/txt/', 
                '/article/', '/content/', '/text/', '/小说/', '/章节/',
                '/ch/', '/chap/', '/volume/', '/story/',
                /\d+\/\d+\.html?/, // 类似 123/456.html
                /\/\d+\/\d+\//,   // 类似 /123/456/
                /\/\d+\.html?$/,  // 类似 /123.html
                /\/\d+\//         // 类似 /123/
            ];
            
            if (urlPatterns.some(pattern => 
                typeof pattern === 'string' ? path.includes(pattern) : pattern.test(path)
            )) {
                console.log('VIA检测: 匹配URL模式');
                return true;
            }

            // 3. 内容特征检测（降低阈值）
            const textContent = document.body.textContent || '';
            const hasNovelKeywords = this.contentPatterns.some(pattern => 
                pattern.test(textContent)
            );

            // 4. 章节导航检测
            const hasChapterNav = this.navPatterns.some(pattern => 
                pattern.test(textContent)
            );

            // 5. 内容区域检测
            const hasContentArea = this.findContentArea() !== null;

            // 6. 页面结构检测
            const hasNovelStructure = this.hasNovelStructure();

            // VIA浏览器风格：满足任一条件即可启用
            const isNovel = hasNovelKeywords || hasChapterNav || hasContentArea || hasNovelStructure;
            
            if (isNovel) {
                console.log('VIA检测结果:', {
                    hasNovelKeywords,
                    hasChapterNav, 
                    hasContentArea,
                    hasNovelStructure
                });
            }
            
            return isNovel;
        },

        // VIA浏览器风格页面结构分析
        hasNovelStructure() {
            // 检查章节标题
            const titleSelectors = [
                'h1', 'h2', 'h3', 'h4',
                '.chapter-title', '.title', '.novel-title',
                '.book-title', '.content-title', '.entry-title'
            ];
            
            const hasChapterTitle = titleSelectors.some(selector => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).some(el => {
                    const text = el.textContent.trim();
                    return text && (
                        (text.includes('第') && text.includes('章')) || 
                        text.match(/Chapter\s+\d+/i) ||
                        (text.length > 3 && text.length < 100 && !this.isNoiseElement(el))
                    );
                });
            });

            // 检查文本内容量（VIA浏览器风格：更宽松）
            const textNodes = document.querySelectorAll('p, div, article, section');
            let textLength = 0;
            let validParagraphs = 0;
            
            textNodes.forEach(node => {
                const text = node.textContent || '';
                if (text.length > 30 && !this.isNoiseElement(node) && 
                    node.offsetWidth > 0 && node.offsetHeight > 0) {
                    textLength += text.length;
                    validParagraphs++;
                }
            });

            // VIA浏览器风格：只要有标题和一定文本量就认为是小说页面
            return hasChapterTitle && textLength > 200 && validParagraphs >= 2;
        },

        // VIA浏览器风格内容区域查找
        findContentArea() {
            const contentSelectors = [
                // 中文网站
                '.content', '.chapter-content', '.novel-content', '.read-content',
                '.text-content', '.article-content', '.chapter-text', '.book-content',
                '.story-content', '.main-content', '.entry-content',
                '#content', '#chapter-content', '#novel-content', '#read-content',
                '#text-content', '#article-content',
                // 英文网站  
                '.chapter', '.chapter-body', '.chapter-content', '.novel-body',
                '.entry-content', '.post-content', '.story-content', '.content-body',
                // 通用选择器
                'article', 'main', '[role="main"]', '.main-content',
                // VIA浏览器特色：尝试body直接内容
                'body'
            ];

            for (const selector of contentSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || '';
                    if (text.length > 100 && this.isLikelyNovelContent(text)) {
                        console.log('VIA找到内容区域:', selector);
                        return element;
                    }
                }
            }

            // VIA浏览器风格：智能内容提取作为回退
            console.log('VIA使用智能内容提取');
            return this.extractIntelligentContent();
        },

        // VIA浏览器风格内容判断
        isLikelyNovelContent(text) {
            const novelIndicators = [
                // 中文特征
                /第[零一二三四五六七八九十百千]+章/,
                /[「」『』""""]/, // 对话引号
                /说道|问道|喊道|笑道|心想|觉得|看着|说道/,
                /[\u4e00-\u9fa5]{10,}/, // 连续中文
                // 英文特征
                /chapter\s+\d+/i,
                /said|asked|replied|thought|exclaimed|whispered/i,
                /"[^"]*"/, // 英文对话
                // 通用特征
                /\n{2,}/, // 多个换行
                /\.\s+[A-Z]/, // 句子开头大写
                /\w{20,}/ // 长单词（可能包含中文）
            ];

            return novelIndicators.some(pattern => pattern.test(text));
        },

        // VIA浏览器风格智能内容提取
        extractIntelligentContent() {
            // 收集所有可能的段落
            const allElements = Array.from(document.querySelectorAll('*'));
            const contentElements = [];
            
            allElements.forEach(element => {
                if (this.isContentElement(element)) {
                    contentElements.push(element);
                }
            });

            // 按文本长度排序
            contentElements.sort((a, b) => {
                const aText = a.textContent || '';
                const bText = b.textContent || '';
                return bText.length - aText.length;
            });

            // 创建内容容器
            const contentContainer = document.createElement('div');
            contentContainer.className = 'via-reader-content';

            // 添加最有可能是内容的元素
            let totalLength = 0;
            for (let i = 0; i < Math.min(20, contentElements.length); i++) {
                const element = contentElements[i];
                const text = element.textContent || '';
                
                if (text.length > 50) {
                    const clone = element.cloneNode(true);
                    this.cleanNoiseFromElement(clone);
                    contentContainer.appendChild(clone);
                    totalLength += text.length;
                    
                    // VIA浏览器风格：收集足够内容后停止
                    if (totalLength > 800) break;
                }
            }

            return contentContainer.children.length > 0 ? contentContainer : null;
        },

        // VIA浏览器风格内容元素判断
        isContentElement(element) {
            if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
                return false;
            }

            if (this.isNoiseElement(element)) {
                return false;
            }

            const tagName = element.tagName.toLowerCase();
            const text = element.textContent || '';
            
            // 允许的元素类型
            const allowedTags = ['p', 'div', 'span', 'article', 'section', 'main'];
            if (!allowedTags.includes(tagName)) {
                return false;
            }

            // 文本长度要求
            if (text.length < 30) {
                return false;
            }

            // 检查是否包含小说特征
            return this.isLikelyNovelContent(text);
        },

        // VIA浏览器风格噪音清理
        cleanNoiseFromElement(element) {
            const noiseSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 
                '.ad', '.advertisement', '.sidebar', '.comment',
                '.social-share', '.related-posts', '.menu', '.navigation',
                '.ads', '.ad-container', '.banner', '.popup',
                '.share', '.toolbar', '.breadcrumb', '.pagination',
                '.widget', '.recommend', '.hot', '.tags',
                '.author', '.info', '.meta', '.date',
                '.login', '.register', '.search', '.footer',
                '.header', '.nav', '.navbar', '.menu'
            ];
            
            noiseSelectors.forEach(selector => {
                const elements = element.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
        },

        // VIA浏览器风格噪音判断
        isNoiseElement(element) {
            const noiseSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 
                '.ad', '.advertisement', '.sidebar', '.comment',
                '.social-share', '.related-posts', '.menu', '.navigation',
                '.ads', '.ad-container', '.banner', '.popup',
                '.share', '.toolbar', '.breadcrumb', '.pagination',
                '.widget', '.recommend', '.hot', '.tags',
                '.author', '.info', '.meta', '.date',
                '.login', '.register', '.search'
            ];
            
            // 选择器匹配
            const isNoiseBySelector = noiseSelectors.some(selector => 
                element.matches(selector) || element.closest(selector)
            );
            
            // 内容关键词匹配
            if (!isNoiseBySelector) {
                const text = element.textContent || '';
                const noiseKeywords = [
                    '广告', '推广', 'sponsored', 'advertisement', '推荐',
                    '登录', '注册', '搜索', '菜单', '导航',
                    'copyright', '版权所有', 'all rights reserved'
                ];
                if (noiseKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
                    return true;
                }
            }
            
            return isNoiseBySelector;
        }
    };

    // VIA浏览器风格章节导航器
    const VIAChapterNavigator = {
        // VIA浏览器风格链接查找
        findChapterLinks() {
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const chapterLinks = [];
            
            allLinks.forEach(link => {
                if (this.isChapterLink(link)) {
                    chapterLinks.push(link);
                }
            });
            
            return chapterLinks;
        },

        // VIA浏览器风格链接判断
        isChapterLink(link) {
            const href = link.href.toLowerCase();
            const text = (link.textContent || '').toLowerCase().trim();
            const title = (link.title || '').toLowerCase();
            
            // URL模式匹配
            const urlPatterns = [
                /chapter|chap|ch\.?\/?\d+/i,
                /第[零一二三四五六七八九十百千]+章/,
                /\d+\/\d+\.html?/,
                /read|novel|book.*\d+/i,
                /\/\d+\.html?$/,
                /\/\d+\/$/
            ];
            
            // 文本模式匹配
            const textPatterns = [
                /上一[章节回]|下一[章节回]/,
                /第[零一二三四五六七八九十百千]+章/,
                /chapter\s+\d+/i,
                /prev|next|previous/i,
                /^[\d\.]+$/ // 纯数字章节号
            ];
            
            const hasUrlPattern = urlPatterns.some(pattern => pattern.test(href));
            const hasTextPattern = textPatterns.some(pattern => pattern.test(text) || pattern.test(title));
            
            // VIA浏览器风格：宽松匹配
            return hasUrlPattern || hasTextPattern || text.length <= 20 && /\d+/.test(text);
        },

        // VIA浏览器风格智能导航
        navigateToChapter(direction) {
            console.log(`VIA导航: 尝试${direction === 'next' ? '下一章' : '上一章'}`);
            
            // 保存当前状态
            this.savePageState();
            
            // 查找链接
            const link = direction === 'prev' ? this.findPrevChapter() : this.findNextChapter();
            
            if (link) {
                console.log('VIA找到章节链接:', link.href);
                return this.safeNavigate(link);
            } else {
                console.log('VIA未找到明确链接，尝试智能导航');
                return this.smartNavigate(direction);
            }
        },

        // VIA浏览器风格安全导航
        safeNavigate(link) {
            return new Promise((resolve) => {
                // VIA浏览器风格：平滑过渡
                if (state.isReadingMode) {
                    ReadingModeManager.exit();
                }
                
                setTimeout(() => {
                    try {
                        // 方法1: 直接跳转
                        if (link.href && link.href !== window.location.href) {
                            window.location.href = link.href;
                            resolve(true);
                            return;
                        }
                        
                        // 方法2: 事件触发
                        const clickEvent = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        link.dispatchEvent(clickEvent);
                        
                        // 方法3: 模拟点击
                        setTimeout(() => {
                            link.click();
                        }, 100);
                        
                        resolve(true);
                    } catch (error) {
                        console.error('VIA导航失败:', error);
                        resolve(false);
                    }
                }, 200);
            });
        },

        // VIA浏览器风格查找上一章
        findPrevChapter() {
            const links = this.findChapterLinks();
            const currentUrl = window.location.href;
            
            // 基于URL模式查找
            for (const link of links) {
                const text = (link.textContent || '').toLowerCase();
                if (text.includes('上一') || text.includes('prev') || text.includes('previous')) {
                    return link;
                }
            }
            
            // 智能查找
            return this.findChapterByPattern(links, 'prev');
        },

        // VIA浏览器风格查找下一章
        findNextChapter() {
            const links = this.findChapterLinks();
            const currentUrl = window.location.href;
            
            // 基于URL模式查找
            for (const link of links) {
                const text = (link.textContent || '').toLowerCase();
                if (text.includes('下一') || text.includes('next')) {
                    return link;
                }
            }
            
            // 智能查找
            return this.findChapterByPattern(links, 'next');
        },

        // VIA浏览器风格智能查找
        findChapterByPattern(links, direction) {
            const currentUrl = window.location.href;
            const currentChapter = this.extractChapterNumber(currentUrl);
            
            if (currentChapter !== null) {
                const targetChapter = direction === 'next' ? currentChapter + 1 : currentChapter - 1;
                
                for (const link of links) {
                    const linkChapter = this.extractChapterNumber(link.href);
                    if (linkChapter === targetChapter) {
                        return link;
                    }
                }
            }
            
            // 回退：返回第一个或最后一个链接
            return links.length > 0 ? (direction === 'next' ? links[links.length - 1] : links[0]) : null;
        },

        // VIA浏览器风格章节号提取
        extractChapterNumber(url) {
            const patterns = [
                /(\d+)\.html?$/,
                /\/(\d+)\/$/,
                /chapter[_-]?(\d+)/i,
                /第(\d+)章/,
                /ch\.?(\d+)/i
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return parseInt(match[1], 10);
                }
            }
            
            return null;
        },

        // VIA浏览器风格智能导航
        smartNavigate(direction) {
            console.log(`VIA智能导航: ${direction}`);
            
            // 尝试多种导航策略
            const strategies = [
                () => this.tryPagination(direction),
                () => this.tryUrlPattern(direction),
                () => this.tryContentNavigation(direction)
            ];
            
            for (const strategy of strategies) {
                const result = strategy();
                if (result) {
                    return result;
                }
            }
            
            return false;
        },

        // VIA浏览器风格分页导航
        tryPagination(direction) {
            const paginationSelectors = [
                '.pagination', '.page-nav', '.chapter-nav',
                '.next-page', '.prev-page', '.page-next', '.page-prev'
            ];
            
            for (const selector of paginationSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const links = element.querySelectorAll('a');
                    for (const link of links) {
                        const text = (link.textContent || '').toLowerCase();
                        if ((direction === 'next' && (text.includes('下一') || text.includes('next'))) ||
                            (direction === 'prev' && (text.includes('上一') || text.includes('prev')))) {
                            return this.safeNavigate(link);
                        }
                    }
                }
            }
            
            return false;
        },

        // VIA浏览器风格URL模式导航
        tryUrlPattern(direction) {
            const currentUrl = window.location.href;
            const currentChapter = this.extractChapterNumber(currentUrl);
            
            if (currentChapter !== null) {
                const targetChapter = direction === 'next' ? currentChapter + 1 : currentChapter - 1;
                const newUrl = currentUrl.replace(
                    /(\d+)(\.html?|\/)?$/,
                    targetChapter + '$2'
                );
                
                if (newUrl !== currentUrl) {
                    this.savePageState();
                    setTimeout(() => {
                        window.location.href = newUrl;
                    }, 100);
                    return true;
                }
            }
            
            return false;
        },

        // VIA浏览器风格内容导航
        tryContentNavigation(direction) {
            // 在页面底部或顶部查找导航元素
            const contentArea = VIAPageDetector.findContentArea();
            if (contentArea) {
                const navElements = contentArea.querySelectorAll('a, button, .nav, .navigation');
                for (const element of navElements) {
                    const text = (element.textContent || '').toLowerCase();
                    if ((direction === 'next' && (text.includes('下一') || text.includes('next'))) ||
                        (direction === 'prev' && (text.includes('上一') || text.includes('prev')))) {
                        return this.safeNavigate(element);
                    }
                }
            }
            
            return false;
        },

        // VIA浏览器风格状态保存
        savePageState() {
            state.pageState = {
                currentUrl: window.location.href,
                scrollPosition: window.pageYOffset,
                readingModeActive: state.isReadingMode,
                chapterTitle: document.title
            };
            
            try {
                GM_setValue('pageState', state.pageState);
            } catch (error) {
                console.warn('VIA状态保存失败:', error);
            }
        },

        // VIA浏览器风格状态恢复
        restorePageState() {
            try {
                const savedState = GM_getValue('pageState');
                if (savedState && savedState.currentUrl === window.location.href) {
                    state.pageState = savedState;
                    
                    if (savedState.readingModeActive && !state.isReadingMode) {
                        setTimeout(() => {
                            ReadingModeManager.enter();
                        }, 500);
                    }
                    
                    setTimeout(() => {
                        window.scrollTo(0, savedState.scrollPosition);
                    }, 1000);
                }
            } catch (error) {
                console.warn('VIA状态恢复失败:', error);
            }
        }
    };

    // VIA浏览器风格阅读模式管理器
    const ReadingModeManager = {
        // 进入阅读模式
        enter() {
            if (state.isReadingMode) return;
            
            console.log('VIA进入阅读模式');
            state.isReadingMode = true;
            
            // 保存原始内容
            state.originalBodyContent = document.body.innerHTML;
            
            // 提取内容
            const contentArea = VIAPageDetector.findContentArea();
            if (contentArea) {
                state.enhancedContent = this.createEnhancedContent(contentArea);
                document.body.innerHTML = '';
                document.body.appendChild(state.enhancedContent);
            } else {
                // 回退：清理页面
                this.cleanPageForReading();
            }
            
            // 应用样式
            this.applyReadingStyles();
            
            // 显示控制面板
            this.showControlPanel();
            
            // 保存状态
            VIAChapterNavigator.savePageState();
        },

        // 退出阅读模式
        exit() {
            if (!state.isReadingMode) return;
            
            console.log('VIA退出阅读模式');
            state.isReadingMode = false;
            
            // 恢复原始内容
            if (state.originalBodyContent) {
                document.body.innerHTML = state.originalBodyContent;
            }
            
            // 移除样式
            this.removeReadingStyles();
            
            // 隐藏控制面板
            this.hideControlPanel();
            
            // 保存状态
            VIAChapterNavigator.savePageState();
        },

        // 创建增强内容
        createEnhancedContent(contentArea) {
            const container = document.createElement('div');
            container.className = 'via-reader-container';
            
            // 添加标题
            const title = this.extractChapterTitle();
            if (title) {
                const titleElement = document.createElement('h1');
                titleElement.className = 'via-chapter-title';
                titleElement.textContent = title;
                container.appendChild(titleElement);
            }
            
            // 添加内容
            const contentClone = contentArea.cloneNode(true);
            VIAPageDetector.cleanNoiseFromElement(contentClone);
            container.appendChild(contentClone);
            
            // 添加导航
            const navigation = this.createNavigation();
            container.appendChild(navigation);
            
            return container;
        },

        // 提取章节标题
        extractChapterTitle() {
            const titleSelectors = [
                'h1', 'h2', 'h3', '.chapter-title', '.title', 
                '.novel-title', '.entry-title', '.post-title'
            ];
            
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent.trim();
                    if (text && text.length > 0 && text.length < 200) {
                        return text;
                    }
                }
            }
            
            return document.title;
        },

        // 创建导航
        createNavigation() {
            const nav = document.createElement('div');
            nav.className = 'via-navigation';
            
            const prevButton = document.createElement('button');
            prevButton.className = 'via-nav-btn via-prev-btn';
            prevButton.textContent = '上一章';
            prevButton.onclick = () => VIAChapterNavigator.navigateToChapter('prev');
            
            const nextButton = document.createElement('button');
            nextButton.className = 'via-nav-btn via-next-btn';
            nextButton.textContent = '下一章';
            nextButton.onclick = () => VIAChapterNavigator.navigateToChapter('next');
            
            nav.appendChild(prevButton);
            nav.appendChild(nextButton);
            
            return nav;
        },

        // 清理页面用于阅读
        cleanPageForReading() {
            const noiseSelectors = [
                'script', 'style', 'nav', 'header', 'footer',
                '.ad', '.advertisement', '.sidebar', '.comment',
                '.social-share', '.related-posts', '.menu', '.navigation',
                '.ads', '.ad-container', '.banner', '.popup',
                '.share', '.toolbar', '.breadcrumb', '.pagination',
                '.widget', '.recommend', '.hot', '.tags'
            ];
            
            noiseSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
        },

        // 应用阅读样式
        applyReadingStyles() {
            const style = document.createElement('style');
            style.id = 'via-reader-styles';
            style.textContent = `
                .via-reader-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                    font-size: 16px;
                    font-family: 'Microsoft YaHei', 'SimSun', serif;
                    color: #333;
                    background: #f8f8f8;
                }
                
                .via-chapter-title {
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 24px;
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                }
                
                .via-navigation {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                }
                
                .via-nav-btn {
                    padding: 10px 20px;
                    border: 1px solid #3498db;
                    background: white;
                    color: #3498db;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .via-nav-btn:hover {
                    background: #3498db;
                    color: white;
                }
                
                .via-control-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 10000;
                    min-width: 200px;
                }
                
                .via-control-btn {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    margin: 5px 0;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    text-align: left;
                }
                
                .via-control-btn:hover {
                    background: #f5f5f5;
                }
                
                .via-control-btn.active {
                    background: #3498db;
                    color: white;
                    border-color: #3498db;
                }
                
                .via-floating-btn {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10000;
                    font-size: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                
                .via-floating-btn:hover {
                    background: #2980b9;
                    transform: scale(1.1);
                }
            `;
            document.head.appendChild(style);
        },

        // 移除阅读样式
        removeReadingStyles() {
            const style = document.getElementById('via-reader-styles');
            if (style) {
                style.remove();
            }
        },

        // 显示控制面板
        showControlPanel() {
            if (state.controlPanel) {
                state.controlPanel.style.display = 'block';
                return;
            }
            
            const panel = document.createElement('div');
            panel.className = 'via-control-panel';
            panel.innerHTML = `
                <button class="via-control-btn" onclick="ReadingModeManager.exit()">退出阅读模式</button>
                <button class="via-control-btn" onclick="VIAChapterNavigator.navigateToChapter('prev')">上一章</button>
                <button class="via-control-btn" onclick="VIAChapterNavigator.navigateToChapter('next')">下一章</button>
                <button class="via-control-btn" onclick="toggleAutoScroll()">自动滚动</button>
            `;
            
            document.body.appendChild(panel);
            state.controlPanel = panel;
        },

        // 隐藏控制面板
        hideControlPanel() {
            if (state.controlPanel) {
                state.controlPanel.style.display = 'none';
            }
        }
    };

    // 浮动按钮管理
    const FloatingButtonManager = {
        create() {
            if (state.floatingButton) return;
            
            const button = document.createElement('button');
            button.className = 'via-floating-btn';
            button.textContent = '📖';
            button.title = 'VIA阅读模式';
            button.onclick = () => {
                if (state.isReadingMode) {
                    ReadingModeManager.exit();
                } else {
                    ReadingModeManager.enter();
                }
            };
            
            document.body.appendChild(button);
            state.floatingButton = button;
        },
        
        remove() {
            if (state.floatingButton) {
                state.floatingButton.remove();
                state.floatingButton = null;
            }
        }
    };

    // 自动滚动功能
    let autoScrollInterval = null;
    let currentScrollSpeed = 1;

    function toggleAutoScroll() {
        if (autoScrollInterval) {
            stopAutoScroll();
        } else {
            startAutoScroll();
        }
    }

    function startAutoScroll() {
        stopAutoScroll();
        
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, currentScrollSpeed);
            
            // 检查是否到达底部
            if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 10) {
                // 自动跳转到下一章
                VIAChapterNavigator.navigateToChapter('next');
            }
        }, 50);
    }

    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }

    function setScrollSpeed(speed) {
        currentScrollSpeed = speed;
        if (autoScrollInterval) {
            stopAutoScroll();
            startAutoScroll();
        }
    }

    // 初始化
    function init() {
        console.log('VIA小说阅读助手初始化');
        
        // 检测页面类型
        if (VIAPageDetector.isNovelPage()) {
            console.log('检测到小说页面，创建浮动按钮');
            FloatingButtonManager.create();
            
            // 恢复之前的状态
            VIAChapterNavigator.restorePageState();
            
            // 注册菜单命令
            try {
                GM_registerMenuCommand('进入阅读模式', () => ReadingModeManager.enter());
                GM_registerMenuCommand('退出阅读模式', () => ReadingModeManager.exit());
                GM_registerMenuCommand('上一章', () => VIAChapterNavigator.navigateToChapter('prev'));
                GM_registerMenuCommand('下一章', () => VIAChapterNavigator.navigateToChapter('next'));
            } catch (error) {
                console.warn('菜单命令注册失败:', error);
            }
        } else {
            console.log('未检测到小说页面');
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
