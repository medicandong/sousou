// ==UserScript==
// @name         搜索引擎快速切换助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在搜索框下方快速切换搜索引擎，支持自定义设置
// @author       Your Name
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 默认搜索引擎配置
    const defaultEngines = [
        {
            id: 'google',
            name: 'Google',
            url: 'https://www.google.com/search?q={query}',
            logo: 'https://www.google.com/favicon.ico',
            domains: [
                { name: 'Google.com', url: 'https://www.google.com/search?q={query}' },
                { name: 'Google.hk', url: 'https://www.google.com.hk/search?q={query}' },
                { name: 'Google.jp', url: 'https://www.google.co.jp/search?q={query}' }
            ]
        },
        {
            id: 'yandex',
            name: 'Yandex',
            url: 'https://yandex.com/search/?text={query}',
            logo: 'https://yandex.com/favicon.ico'
        },
        {
            id: 'duckduckgo',
            name: 'DuckDuckGo',
            url: 'https://duckduckgo.com/?q={query}',
            logo: 'https://duckduckgo.com/favicon.ico'
        },
        {
            id: 'baidu',
            name: '百度',
            url: 'https://www.baidu.com/s?wd={query}',
            logo: 'https://www.baidu.com/favicon.ico'
        },
        {
            id: 'bing',
            name: 'Bing',
            url: 'https://www.bing.com/search?q={query}',
            logo: 'https://www.bing.com/favicon.ico'
        }
    ];

    // 获取用户配置
    function getUserEngines() {
        return GM_getValue('userEngines', defaultEngines);
    }

    function getDefaultEngines() {
        return GM_getValue('defaultEngines', ['google', 'yandex', 'duckduckgo']);
    }

    // 保存用户配置
    function saveUserEngines(engines) {
        GM_setValue('userEngines', engines);
    }

    function saveDefaultEngines(engines) {
        GM_setValue('defaultEngines', engines);
    }

    // 添加CSS样式
    GM_addStyle(`
        .search-engine-switcher {
            position: fixed;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: calc(100vw - 40px);
            max-width: 400px;
            left: 50%;
            transform: translateX(-50%);
            box-sizing: border-box;
        }

        .search-engine-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            flex: 1;
            min-width: 0;
            text-decoration: none;
            color: #333;
            margin: 0 4px;
        }

        .search-engine-item:hover {
            background: rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
        }

        .search-engine-logo {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            margin-bottom: 4px;
        }

        .search-engine-name {
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        /* 响应式设计 - 小屏幕适配 */
        @media (max-width: 360px) {
            .search-engine-switcher {
                padding: 10px 12px;
                width: calc(100vw - 30px);
            }
            
            .search-engine-item {
                padding: 6px;
                margin: 0 2px;
            }
            
            .search-engine-logo {
                width: 20px;
                height: 20px;
            }
            
            .search-engine-name {
                font-size: 10px;
            }
        }

        /* 响应式设计 - 中等屏幕 */
        @media (min-width: 361px) and (max-width: 480px) {
            .search-engine-switcher {
                padding: 12px 14px;
                width: calc(100vw - 35px);
            }
            
            .search-engine-item {
                padding: 7px;
                margin: 0 3px;
            }
        }

        /* 响应式设计 - 大屏幕 */
        @media (min-width: 481px) {
            .search-engine-switcher {
                max-width: 450px;
            }
            
            .search-engine-item {
                padding: 10px;
                margin: 0 5px;
            }
            
            .search-engine-logo {
                width: 28px;
                height: 28px;
            }
            
            .search-engine-name {
                font-size: 13px;
            }
        }

        .search-engine-highlight {
            background-color: #ffeb3b;
            padding: 2px 4px;
            border-radius: 3px;
        }

        .settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            z-index: 10001;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        }

        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .settings-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .close-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
            color: #666;
        }

        .engine-list {
            margin-bottom: 20px;
        }

        .engine-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: move;
        }

        .engine-item img {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            border-radius: 3px;
        }

        .engine-checkbox {
            margin-right: 10px;
        }

        .add-engine-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        }

        .add-engine-form input {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }

        .add-engine-form button {
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        .save-button {
            width: 100%;
            padding: 12px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
    `);

    // 智能定位搜索引擎切换器
    function positionSearchEngineSwitcher() {
        const searchInput = findSearchInput();
        const existingSwitcher = document.querySelector('.search-engine-switcher');
        
        if (existingSwitcher) {
            existingSwitcher.remove();
        }

        if (!searchInput) {
            // 如果没有找到搜索框，不显示切换器
            return null;
        }

        const userEngines = getUserEngines();
        const defaultEngineIds = getDefaultEngines();
        
        // 过滤出默认显示的引擎
        const displayEngines = userEngines.filter(engine => 
            defaultEngineIds.includes(engine.id)
        );

        if (displayEngines.length === 0) {
            return null;
        }

        const switcher = document.createElement('div');
        switcher.className = 'search-engine-switcher';

        displayEngines.forEach(engine => {
            const engineItem = document.createElement('a');
            engineItem.className = 'search-engine-item';
            engineItem.href = '#';
            engineItem.onclick = (e) => {
                e.preventDefault();
                performSearch(engine);
            };

            const logo = document.createElement('img');
            logo.className = 'search-engine-logo';
            logo.src = engine.logo;
            logo.alt = engine.name;
            logo.onerror = function() {
                // 如果图标加载失败，使用默认图标
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzAwN2JmZiIvPgo8dGV4dCB4PSI1MCIgeT0iMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPj88L3RleHQ+Cjwvc3ZnPgo=';
            };

            const name = document.createElement('span');
            name.className = 'search-engine-name';
            name.textContent = engine.name;

            engineItem.appendChild(logo);
            engineItem.appendChild(name);
            switcher.appendChild(engineItem);
        });

        // 计算搜索框位置并智能定位切换器
        updateSwitcherPosition(switcher, searchInput);

        document.body.appendChild(switcher);
        return switcher;
    }

    // 更新切换器位置
    function updateSwitcherPosition(switcher, searchInput) {
        const rect = searchInput.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // 计算搜索框在视口中的相对位置
        const searchBoxCenterY = rect.top + rect.height / 2;
        const searchBoxCenterX = rect.left + rect.width / 2;
        
        // 判断搜索框位置，决定切换器放置位置
        if (searchBoxCenterY < viewportHeight / 2) {
            // 搜索框在上半部分，切换器放在搜索框下方
            switcher.style.top = 'auto';
            switcher.style.bottom = Math.max(20, viewportHeight - rect.bottom - 10) + 'px';
            switcher.style.left = Math.min(Math.max(50, searchBoxCenterX), viewportWidth - 50) + 'px';
            switcher.style.transform = 'translateX(-50%)';
        } else {
            // 搜索框在下半部分，切换器放在搜索框上方
            switcher.style.top = Math.max(20, rect.top - 60) + 'px';
            switcher.style.bottom = 'auto';
            switcher.style.left = Math.min(Math.max(50, searchBoxCenterX), viewportWidth - 50) + 'px';
            switcher.style.transform = 'translateX(-50%)';
        }
    }

    // 创建搜索引擎切换器
    function createSearchEngineSwitcher() {
        return positionSearchEngineSwitcher();
    }

    // 执行搜索
    function performSearch(engine) {
        const searchInput = findSearchInput();
        if (searchInput && searchInput.value.trim()) {
            const query = encodeURIComponent(searchInput.value.trim());
            const searchUrl = engine.url.replace('{query}', query);
            window.open(searchUrl, '_blank');
        } else {
            // 如果没有搜索词，直接打开搜索引擎主页
            window.open(engine.url.replace('{query}', ''), '_blank');
        }
    }

    // 查找搜索输入框
    function findSearchInput() {
        // 常见的搜索输入框选择器
        const selectors = [
            'input[type="search"]',
            'input[name="q"]',
            'input[name="search"]',
            'input[name="wd"]',
            'input[name="text"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="search"]',
            '.search-input',
            '#search',
            '.gLFyf' // Google搜索框
        ];

        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input && input.offsetParent !== null) {
                return input;
            }
        }

        return null;
    }

    // 关键词高亮功能
    function highlightKeywords() {
        const searchInput = findSearchInput();
        if (!searchInput) return;

        // 监听输入事件
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length < 2) return;

            // 在页面中高亮显示关键词
            highlightTextInPage(query);
        });
    }

    function highlightTextInPage(query) {
        // 移除之前的高亮
        const existingHighlights = document.querySelectorAll('.search-engine-highlight');
        existingHighlights.forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });

        if (query.length < 2) return;

        // 高亮文本
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.toLowerCase().includes(query.toLowerCase())) {
                nodes.push(node);
            }
        }

        nodes.forEach(node => {
            const text = node.textContent;
            const regex = new RegExp(`(${query})`, 'gi');
            const newText = text.replace(regex, '<span class="search-engine-highlight">$1</span>');
            
            if (newText !== text) {
                const span = document.createElement('span');
                span.innerHTML = newText;
                node.parentNode.replaceChild(span, node);
            }
        });
    }

    // 设置面板
    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'settings-header';

        const title = document.createElement('h2');
        title.className = 'settings-title';
        title.textContent = '搜索引擎设置';

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => {
            panel.style.display = 'none';
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        const engineList = document.createElement('div');
        engineList.className = 'engine-list';

        const userEngines = getUserEngines();
        const defaultEngineIds = getDefaultEngines();

        userEngines.forEach(engine => {
            const engineItem = document.createElement('div');
            engineItem.className = 'engine-item';
            engineItem.draggable = true;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'engine-checkbox';
            checkbox.checked = defaultEngineIds.includes(engine.id);
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    if (!defaultEngineIds.includes(engine.id)) {
                        defaultEngineIds.push(engine.id);
                    }
                } else {
                    const index = defaultEngineIds.indexOf(engine.id);
                    if (index > -1) {
                        defaultEngineIds.splice(index, 1);
                    }
                }
                saveDefaultEngines(defaultEngineIds);
            };

            const logo = document.createElement('img');
            logo.src = engine.logo;
            logo.alt = engine.name;

            const name = document.createElement('span');
            name.textContent = engine.name;

            engineItem.appendChild(checkbox);
            engineItem.appendChild(logo);
            engineItem.appendChild(name);
            engineList.appendChild(engineItem);
        });

        // 添加自定义搜索引擎表单
        const addForm = document.createElement('div');
        addForm.className = 'add-engine-form';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '搜索引擎名称';

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = '搜索URL（使用{query}作为查询参数）';

        const logoInput = document.createElement('input');
        logoInput.type = 'text';
        logoInput.placeholder = '图标URL';

        const addButton = document.createElement('button');
        addButton.textContent = '添加搜索引擎';
        addButton.onclick = () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            const logo = logoInput.value.trim();

            if (name && url && logo) {
                const newEngine = {
                    id: 'custom_' + Date.now(),
                    name: name,
                    url: url,
                    logo: logo
                };

                const engines = getUserEngines();
                engines.push(newEngine);
                saveUserEngines(engines);

                // 刷新设置面板
                panel.remove();
                createSettingsPanel();
                showSettings();
            }
        };

        addForm.appendChild(nameInput);
        addForm.appendChild(urlInput);
        addForm.appendChild(logoInput);
        addForm.appendChild(addButton);

        const saveButton = document.createElement('button');
        saveButton.className = 'save-button';
        saveButton.textContent = '保存设置';
        saveButton.onclick = () => {
            panel.style.display = 'none';
            // 重新创建搜索引擎切换器
            const oldSwitcher = document.querySelector('.search-engine-switcher');
            if (oldSwitcher) oldSwitcher.remove();
            createSearchEngineSwitcher();
        };

        panel.appendChild(header);
        panel.appendChild(engineList);
        panel.appendChild(addForm);
        panel.appendChild(saveButton);

        document.body.appendChild(panel);
        return panel;
    }

    function showSettings() {
        const panel = document.querySelector('.settings-panel') || createSettingsPanel();
        panel.style.display = 'block';
    }

    // 注册菜单命令
    GM_registerMenuCommand('搜索引擎设置', showSettings);

    // 动态重新定位功能
    function setupDynamicRepositioning() {
        let lastScrollY = window.scrollY;
        let repositionTimeout = null;

        // 监听滚动事件
        window.addEventListener('scroll', function() {
            if (Math.abs(window.scrollY - lastScrollY) > 50) {
                lastScrollY = window.scrollY;
                
                // 防抖处理
                clearTimeout(repositionTimeout);
                repositionTimeout = setTimeout(() => {
                    const switcher = document.querySelector('.search-engine-switcher');
                    const searchInput = findSearchInput();
                    
                    if (switcher && searchInput) {
                        updateSwitcherPosition(switcher, searchInput);
                    }
                }, 100);
            }
        });

        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            const switcher = document.querySelector('.search-engine-switcher');
            const searchInput = findSearchInput();
            
            if (switcher && searchInput) {
                updateSwitcherPosition(switcher, searchInput);
            }
        });

        // 监听搜索框焦点事件，重新定位
        document.addEventListener('focusin', function(e) {
            if (e.target.matches('input[type="search"], input[name="q"], input[name="search"], input[name="wd"], input[name="text"]')) {
                const switcher = document.querySelector('.search-engine-switcher');
                if (switcher) {
                    updateSwitcherPosition(switcher, e.target);
                } else {
                    createSearchEngineSwitcher();
                }
            }
        });
    }

    // 初始化
    function init() {
        createSearchEngineSwitcher();
        highlightKeywords();
        createSettingsPanel();
        setupDynamicRepositioning();
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
