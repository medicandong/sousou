// ==UserScript==
// @name         小说阅读助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  通用小说阅读助手，支持自动翻页、繁简转换、夜间模式等功能
// @author       小说阅读助手
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 配置和设置
    const Settings = {
        autoScroll: false,
        autoScrollDelay: 30, // 秒
        traditional: false,
        fontSize: 16,
        darkMode: false,
        lastRead: {},

        init() {
            this.load();
            this.bindEvents();
        },

        load() {
            const saved = GM_getValue('novelSettings', '{}');
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
            } catch(e) {
                console.log('加载设置失败');
            }
        },

        save() {
            const data = {
                autoScroll: this.autoScroll,
                autoScrollDelay: this.autoScrollDelay,
                traditional: this.traditional,
                fontSize: this.fontSize,
                darkMode: this.darkMode,
                lastRead: this.lastRead
            };
            GM_setValue('novelSettings', JSON.stringify(data));
        },

        bindEvents() {
            // 监听设置变更
            Object.keys(this).forEach(key => {
                let value = this[key];
                Object.defineProperty(this, key, {
                    get() {
                        return value;
                    },
                    set(newValue) {
                        value = newValue;
                        this.save();
                        return true;
                    },
                    enumerable: true,
                    configurable: true
                });
            });
        }
    };

    // 繁简转换映射表
    const charMap = {
        '著': '着', '裏': '里', '後': '后', '來': '来', '時': '时',
        '實': '实', '現': '现', '個': '个', '這': '这', '邊': '边',
        '對': '对', '長': '长', '發': '发', '過': '过', '東': '东',
        '務': '务', '業': '业', '學': '学', '問': '问', '開': '开',
        '關': '关', '門': '门', '見': '见', '員': '员', '從': '从',
        '氣': '气', '機': '机', '車': '车', '進': '进', '論': '论',
        '據': '据', '經': '经', '與': '与', '為': '为', '應': '应',
        '頭': '头', '產': '产', '內': '内', '資': '资', '質': '质'
    };

    // 主要功能
    const NovelReader = {
        currentElement: null,
        scrollTimer: null,
        pageBottomTimer: null,

        init() {
            Settings.init();
            this.createUI();
            this.detectAndConvert();
            this.bindGlobalEvents();
        },

        createUI() {
            // 添加样式
            GM_addStyle(`
                /* 浮动按钮样式 - 设计更美观 */
                .novel-float-btn {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                    cursor: pointer;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                }

                .novel-float-btn:hover {
                    transform: scale(1.1) rotate(10deg);
                    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
                }

                .novel-float-btn:active {
                    transform: scale(0.95);
                }

                .novel-float-btn::before {
                    content: "阅";
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                /* 设置面板 - 毛玻璃效果 */
                .novel-settings-panel {
                    position: fixed;
                    bottom: 100px;
                    right: 30px;
                    width: 320px;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
                    z-index: 999998;
                    display: none;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                .novel-settings-panel.active {
                    display: block;
                    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* 面板头部 */
                .novel-settings-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: 600;
                    letter-spacing: 1px;
                }

                /* 设置分块 */
                .novel-settings-section {
                    padding: 20px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }

                .novel-settings-section:last-child {
                    border-bottom: none;
                }

                .novel-section-label {
                    font-size: 14px;
                    color: #667eea;
                    margin-bottom: 15px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* 导航按钮 */
                .novel-nav-buttons {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }

                .novel-nav-btn {
                    padding: 12px;
                    background: rgba(102, 126, 234, 0.1);
                    border: 1px solid rgba(102, 126, 234, 0.2);
                    border-radius: 12px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 14px;
                    color: #667eea;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .novel-nav-btn:hover {
                    background: rgba(102, 126, 234, 0.2);
                    transform: translateY(-2px);
                }

                .novel-nav-btn:active {
                    transform: translateY(0);
                }

                /* 设置项 */
                .novel-setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }

                .novel-setting-item:last-child {
                    border-bottom: none;
                }

                .novel-setting-label {
                    font-size: 14px;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .novel-toggle {
                    width: 50px;
                    height: 28px;
                    background: #e0e0e0;
                    border-radius: 14px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }

                .novel-toggle.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .novel-toggle::after {
                    content: '';
                    position: absolute;
                    width: 24px;
                    height: 24px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .novel-toggle.active::after {
                    transform: translateX(22px);
                }

                /* 字体大小调节 */
                .novel-font-controls {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .novel-font-btn {
                    width: 36px;
                    height: 36px;
                    border: 1px solid rgba(102, 126, 234, 0.3);
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    color: #667eea;
                    transition: all 0.3s ease;
                }

                .novel-font-btn:hover {
                    background: rgba(102, 126, 234, 0.2);
                    transform: scale(1.1);
                }

                .novel-font-size {
                    min-width: 40px;
                    text-align: center;
                    font-size: 16px;
                    font-weight: 600;
                    color: #667eea;
                }

                /* 夜间模式 */
                .novel-dark-mode {
                    background: rgba(30, 30, 40, 0.9);
                    color: #e0e0e0;
                }

                .novel-dark-mode .novel-settings-section {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .novel-dark-mode .novel-section-label {
                    color: #a78bfa;
                }

                .novel-dark-mode .novel-nav-btn {
                    background: rgba(167, 139, 250, 0.1);
                    border-color: rgba(167, 139, 250, 0.2);
                    color: #a78bfa;
                }

                .novel-dark-mode .novel-setting-label {
                    color: #e0e0e0;
                }

                /* 动画 */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* 自动翻页指示器 */
                .novel-scroll-indicator {
                    position: fixed;
                    bottom: 100px;
                    right: 50%;
                    transform: translateX(50%);
                    background: rgba(102, 126, 234, 0.9);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    display: none;
                    z-index: 999997;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                }

                .novel-scroll-indicator.active {
                    display: block;
                    animation: fadeInUp 0.3s ease;
                }

                /* 响应式 */
                @media (max-width: 480px) {
                    .novel-settings-panel {
                        width: 280px;
                        right: 20px;
                    }
                    
                    .novel-float-btn {
                        bottom: 20px;
                        right: 20px;
                        width: 50px;
                        height: 50px;
                    }
                }
            `);

            // 创建浮动按钮
            const floatBtn = document.createElement('div');
            floatBtn.className = 'novel-float-btn';
            floatBtn.addEventListener('click', () => this.toggleSettings());
            document.body.appendChild(floatBtn);

            // 创建设置面板
            const panel = document.createElement('div');
            panel.className = 'novel-settings-panel';
            if (Settings.darkMode) {
                panel.classList.add('novel-dark-mode');
            }
            panel.innerHTML = `
                <div class="novel-settings-header">📚 阅读设置</div>
                
                <div class="novel-settings-section">
                    <div class="novel-section-label">📖 章节导航</div>
                    <div class="novel-nav-buttons">
                        <div class="novel-nav-btn" data-action="prev">⬅️ 上一页</div>
                        <div class="novel-nav-btn" data-action="catalog">📑 目录</div>
                        <div class="novel-nav-btn" data-action="next">➡️ 下一页</div>
                    </div>
                </div>

                <div class="novel-settings-section">
                    <div class="novel-section-label">⚙️ 阅读设置</div>
                    
                    <div class="novel-setting-item">
                        <div class="novel-setting-label">🔄 自动翻页</div>
                        <div class="novel-toggle ${Settings.autoScroll ? 'active' : ''}" data-setting="autoScroll"></div>
                    </div>
                    
                    <div class="novel-setting-item">
                        <div class="novel-setting-label">📜 繁简转换</div>
                        <div class="novel-toggle ${Settings.traditional ? 'active' : ''}" data-setting="traditional"></div>
                    </div>
                    
                    <div class="novel-setting-item">
                        <div class="novel-setting-label">🌙 夜间模式</div>
                        <div class="novel-toggle ${Settings.darkMode ? 'active' : ''}" data-setting="darkMode"></div>
                    </div>
                    
                    <div class="novel-setting-item">
                        <div class="novel-setting-label">🔤 字体大小</div>
                        <div class="novel-font-controls">
                            <div class="novel-font-btn" data-action="decrease">-</div>
                            <div class="novel-font-size">${Settings.fontSize}</div>
                            <div class="novel-font-btn" data-action="increase">+</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);

            // 创建自动翻页指示器
            const indicator = document.createElement('div');
            indicator.className = 'novel-scroll-indicator';
            indicator.innerHTML = '📖 自动翻页中...';
            document.body.appendChild(indicator);
        },

        toggleSettings() {
            const panel = document.querySelector('.novel-settings-panel');
            panel.classList.toggle('active');
        },

        detectAndConvert() {
            // 检测当前页面是否有大量文字内容
            const bodyText = document.body.innerText;
            const chineseChars = bodyText.match(/[\u4e00-\u9fa5]/g) || [];
            
            if (chineseChars.length > 1000) { // 假设超过1000个汉字认为是小说页面
                this.currentElement = document.body;
                
                // 自动检测是否为繁体
                const traditionalChars = bodyText.match(/[著裏後來時實現個這邊對長發過東務業學問開關門見員從氣車進論]/g) || [];
                if (traditionalChars.length > chineseChars.length * 0.1) {
                    Settings.traditional = true;
                    this.convertToSimplified();
                }
            }
        },

        convertToSimplified() {
            if (!Settings.traditional) return;
            
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const nodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.parentElement.tagName !== 'SCRIPT' && 
                    node.parentElement.tagName !== 'STYLE' &&
                    node.nodeValue.trim()) {
                    nodes.push(node);
                }
            }

            nodes.forEach(node => {
                let text = node.nodeValue;
                Object.keys(charMap).forEach(key => {
                    text = text.replace(new RegExp(key, 'g'), charMap[key]);
                });
                node.nodeValue = text;
            });
        },

        bindGlobalEvents() {
            // 面板事件
            const panel = document.querySelector('.novel-settings-panel');
            
            panel.addEventListener('click', (e) => {
                const target = e.target;
                
                // 切換开关
                if (target.classList.contains('novel-toggle')) {
                    const setting = target.dataset.setting;
                    Settings[setting] = !Settings[setting];
                    target.classList.toggle('active');
                    
                    switch(setting) {
                        case 'autoScroll':
                            this.toggleAutoScroll();
                            break;
                        case 'traditional':
                            location.reload(); // 刷新页面重新加载
                            break;
                        case 'darkMode':
                            this.toggleDarkMode();
                            break;
                    }
                }

                // 字体大小调节
                if (target.classList.contains('novel-font-btn')) {
                    const action = target.dataset.action;
                    if (action === 'increase') {
                        Settings.fontSize = Math.min(30, Settings.fontSize + 2);
                    } else if (action === 'decrease') {
                        Settings.fontSize = Math.max(12, Settings.fontSize - 2);
                    }
                    this.updateFontSize();
                }

                // 导航按钮
                if (target.classList.contains('novel-nav-btn')) {
                    const action = target.dataset.action;
                    this.handleNavigation(action);
                }
            });

            // 自动滚动检测
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (Settings.autoScroll) {
                        this.checkPageBottom();
                    }
                }, 100);
            });
        },

        toggleAutoScroll() {
            const indicator = document.querySelector('.novel-scroll-indicator');
            if (Settings.autoScroll) {
                indicator.classList.add('active');
                this.startAutoScroll();
            } else {
                indicator.classList.remove('active');
                clearInterval(this.scrollTimer);
            }
        },

        startAutoScroll() {
            this.scrollTimer = setInterval(() => {
                window.scrollBy(0, 2);
            }, 50);
        },

        checkPageBottom() {
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            
            if (scrollPosition >= documentHeight - 100) {
                if (Settings.autoScroll) {
                    this.findAndClickNextLink();
                }
            }
        },

        findAndClickNextLink() {
            // 查找下一页/下一章链接
            const nextPatterns = ['下一', '下章', '下页', 'next', 'Next', '>>', '→', '›'];
            const links = document.querySelectorAll('a');
            
            for (let link of links) {
                const text = link.innerText.trim();
                if (nextPatterns.some(pattern => text.includes(pattern))) {
                    console.log('找到下一页链接:', text);
                    link.click();
                    return;
                }
            }
            
            // 如果没找到，尝试查找包含这些文字的按钮
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                const text = btn.innerText.trim();
                if (nextPatterns.some(pattern => text.includes(pattern))) {
                    console.log('找到下一页按钮:', text);
                    btn.click();
                    return;
                }
            }
        },

        handleNavigation(action) {
            switch(action) {
                case 'prev':
                    this.findAndClickLink(['上一', '上章', 'prev', 'Prev', '<<', '←', '‹']);
                    break;
                case 'next':
                    this.findAndClickLink(['下一', '下章', 'next', 'Next', '>>', '→', '›']);
                    break;
                case 'catalog':
                    this.findAndClickLink(['目', '录', '列表', 'list', 'catalog', 'Catalog']);
                    break;
            }
        },

        findAndClickLink(patterns) {
            const links = document.querySelectorAll('a, button');
            for (let element of links) {
                const text = element.innerText.trim();
                if (patterns.some(pattern => text.includes(pattern))) {
                    element.click();
                    return;
                }
            }
            alert('未找到相关链接，请手动操作');
        },

        updateFontSize() {
            document.body.style.fontSize = Settings.fontSize + 'px';
            document.querySelector('.novel-font-size').textContent = Settings.fontSize;
        },

        toggleDarkMode() {
            const panel = document.querySelector('.novel-settings-panel');
            if (Settings.darkMode) {
                document.body.style.filter = 'invert(1) hue-rotate(180deg)';
                panel.classList.add('novel-dark-mode');
            } else {
                document.body.style.filter = 'none';
                panel.classList.remove('novel-dark-mode');
            }
        }
    };

    // 启动
    NovelReader.init();
})();
