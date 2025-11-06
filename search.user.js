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
        return GM_getValue('defaultEngines', ['google', 'bing', 'baidu', 'duckduckgo']);
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
            background: rgba(255, 255, 255, 0.98);
            border-radius: 16px;
            padding: 12px 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: auto;
            max-width: 500px;
            min-width: 300px;
            box-sizing: border-box;
            animation: switcherSlideIn 0.3s ease-out;
        }

        @keyframes switcherSlideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .search-engine-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            flex: 1;
            min-width: 0;
            text-decoration: none;
            color: #1f2937;
            margin: 0 4px;
            position: relative;
            overflow: hidden;
        }

        .search-engine-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1));
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 12px;
        }

        .search-engine-item:hover {
            background: rgba(59, 130, 246, 0.08);
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .search-engine-item:hover::before {
            opacity: 1;
        }

        .search-engine-logo {
            width: 20px;
            height: 20px;
            border-radius: 6px;
            margin-bottom: 6px;
            object-fit: cover;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            transition: transform 0.3s ease;
        }

        .search-engine-item:hover .search-engine-logo {
            transform: scale(1.1);
        }

        .search-engine-name {
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            color: #374151;
            letter-spacing: -0.01em;
        }

        /* 响应式设计 - 小屏幕适配 */
        @media (max-width: 480px) {
            .search-engine-switcher {
                padding: 10px 12px;
                min-width: 280px;
                max-width: calc(100vw - 40px);
            }
            
            .search-engine-item {
                padding: 6px 8px;
                margin: 0 2px;
            }
            
            .search-engine-logo {
                width: 18px;
                height: 18px;
            }
            
            .search-engine-name {
                font-size: 10px;
            }
        }

        /* 响应式设计 - 大屏幕 */
        @media (min-width: 1024px) {
            .search-engine-switcher {
                padding: 14px 20px;
                max-width: 550px;
            }
            
            .search-engine-item {
                padding: 10px 14px;
                margin: 0 6px;
            }
            
            .search-engine-logo {
                width: 22px;
                height: 22px;
            }
            
            .search-engine-name {
                font-size: 12px;
            }
        }

        .search-engine-highlight {
            background: linear-gradient(120deg, #f0f9ff, #e0f2fe);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            color: #0369a1;
            box-shadow: 0 1px 3px rgba(3, 105, 161, 0.2);
        }

        .settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1);
            z-index: 10001;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: panelSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes panelSlideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -48%) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid rgba(59, 130, 246, 0.1);
        }

        .settings-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
        }

        .close-button {
            background: rgba(59, 130, 246, 0.1);
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 8px 12px;
            color: #3b82f6;
            border-radius: 10px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-button:hover {
            background: rgba(59, 130, 246, 0.2);
            transform: scale(1.1);
        }

        .engine-list {
            margin-bottom: 24px;
        }

        .engine-item {
            display: flex;
            align-items: center;
            padding: 16px;
            background: white;
            border: 2px solid transparent;
            border-radius: 12px;
            margin-bottom: 12px;
            cursor: move;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .engine-item:hover {
            border-color: rgba(59, 130, 246, 0.3);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            transform: translateY(-2px);
        }

        .engine-item img {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            border-radius: 6px;
            object-fit: cover;
        }

        .engine-checkbox {
            margin-right: 12px;
            width: 18px;
            height: 18px;
            accent-color: #3b82f6;
            cursor: pointer;
        }

        .engine-item span {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            flex: 1;
        }

        .add-engine-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 24px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .add-engine-form input {
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: #fafafa;
        }

        .add-engine-form input:focus {
            outline: none;
            border-color: #3b82f6;
            background: white;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .add-engine-form button {
            padding: 12px 20px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .add-engine-form button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .save-button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 700;
            margin-top: 24px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            letter-spacing: 0.02em;
        }

        .save-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 10000;
            animation: overlayFadeIn 0.3s ease;
        }

        @keyframes overlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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
        
        // 计算切换器高度
        const switcherHeight = switcher.offsetHeight;
        const switcherWidth = switcher.offsetWidth;
        
        // 计算搜索框在视口中的相对位置
        const searchBoxCenterY = rect.top + rect.height / 2;
        const searchBoxCenterX = rect.left + rect.width / 2;
        
        // 判断搜索框位置，决定切换器放置位置
        let topPosition, bottomPosition;
        
        if (searchBoxCenterY < viewportHeight / 2) {
            // 搜索框在上半部分，切换器放在搜索框下方
            topPosition = 'auto';
            bottomPosition = Math.max(20, viewportHeight - rect.bottom - 10) + 'px';
        } else {
            // 搜索框在下半部分，切换器放在搜索框上方
            topPosition = Math.max(20, rect.top - switcherHeight - 10) + 'px';
            bottomPosition = 'auto';
        }
        
        // 水平居中定位，确保不超出屏幕边界
        let leftPosition = Math.max(20, Math.min(searchBoxCenterX - switcherWidth / 2, viewportWidth - switcherWidth - 20));
        
        switcher.style.top = topPosition;
        switcher.style.bottom = bottomPosition;
        switcher.style.left = leftPosition + 'px';
        switcher.style.transform = 'none';
        
        // 检查是否遮挡搜索框，如果遮挡则调整位置
        const switcherRect = switcher.getBoundingClientRect();
        const searchInputRect = searchInput.getBoundingClientRect();
        
        // 如果切换器遮挡了搜索框，重新定位
        if (isOverlapping(switcherRect, searchInputRect)) {
            if (searchBoxCenterY < viewportHeight / 2) {
                // 如果在下方的切换器遮挡了搜索框，尝试放在上方
                switcher.style.top = Math.max(20, rect.top - switcherHeight - 10) + 'px';
                switcher.style.bottom = 'auto';
            } else {
                // 如果在上方的切换器遮挡了搜索框，尝试放在下方
                switcher.style.top = 'auto';
                switcher.style.bottom = Math.max(20, viewportHeight - rect.bottom - 10) + 'px';
            }
        }
    }
    
    // 检查两个矩形是否重叠
    function isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
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
            '.gLFyf', // Google搜索框
            '#sb_form_q', // Bing搜索框
            '.b_searchbox', // Bing搜索框
            'input[name="p"]', // Yahoo搜索框
            '#yschsp', // Yahoo搜索框
            '#kw', // 百度搜索框
            '.s_ipt' // 百度搜索框
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
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.onclick = () => {
            overlay.remove();
            const panel = document.querySelector('.settings-panel');
            if (panel) panel.style.display = 'none';
        };

        const panel = document.querySelector('.settings-panel') || createSettingsPanel();
        panel.style.display = 'block';
        
        document.body.appendChild(overlay);
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
            const searchSelectors = [
                'input[type="search"]',
                'input[name="q"]',
                'input[name="search"]',
                'input[name="wd"]',
                'input[name="text"]',
                'input[name="p"]',
                '#sb_form_q',
                '.b_searchbox',
                '#yschsp',
                '#kw',
                '.s_ipt'
            ];
            
            if (searchSelectors.some(selector => e.target.matches(selector))) {
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
