// ==UserScript==
// @name         搜索引擎快速切换助手 (手机优化版)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  参考“优雅的搜索引擎助手”，实现搜索引擎快速切换，支持自定义设置、关键词高亮。默认展示Google、Yandex、DuckDuckGo，支持百度、Bing等常用引擎。优化手机浏览器使用。
// @author       Grok
// @match        *://www.google.*/search*
// @match        *://*.google.*/search*
// @match        *://duckduckgo.com/*
// @match        *://yandex.com/*search*
// @match        *://yandex.ru/*search*
// @match        *://www.baidu.com/*
// @match        *://www.bing.com/*
// @match        *://*.bing.com/search*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 默认搜索引擎配置
    const defaultEngines = {
        google: {
            name: 'Google',
            url: 'https://www.google.com/search?q={q}',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDQuMjVMMTIgMTVDMTMuMjkgMTUuMDggMTQuNzkgMTUuMzYgMTYuMTcgMTUuNTZDMjAuMzEgMTYuNzYgMjMuNjIgMTkuNzEgMjMuNjIgMjQuMDAwMEMyMy42MiAyNC4yNSAyMy40OSAyNC40OSAyMy4yNSAyNC40OUgyLjI1QzIuMDEgMjQuNDkgMS43NSAyNC4yNSAxLjc1IDI0LjAwMUMxLjc1IDE5LjcyIDE1LjA4IDUuNTkgMTUuMDggNS41OUMxNC45MyA1LjQ0IDE0LjcyIDUuMzIgMTQuNDkgNS4yMEMxMS4yMSAzLjg0IDcuODUgMy45NiA0LjU5IDUuMjFDMi4zNCA2LjQ2IDEuMDggOC45NCAxLjA4IDExLjcyQzEuMDggMTQuNTEgMi40NCAxNi45OSAzLjY1IDE4LjIzTDEyIDIzLjI1WiIgZmlsbD0iIzQyODVGMCIvPgo8L3N2Zz4K',
            tld: 'com' // 默认TLD，可动态检测
        },
        yandex: {
            name: 'Yandex',
            url: 'https://yandex.com/search/?text={q}',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjM5IDBIMy4zMUMxLjQ5IDAgMCAxLjQ5IDAgMy4zMVYzOC4xOEMwIDM5Ljk5IDEuNDkgNDEuNDggMy4zMSA0MS40OEgyMC42OUMyMi41MSA0MS40OCAyNCAzOS45OSAyNCAzOC4xOFYxOS4yNUwxOS4zOSAwWk0xOC45OSAxOS4yNUg2LjQ5VjM3Ljk4SDI1LjkxVjE5LjI1SDI4LjQ5VjM4LjE4QzI4LjQ5IDQwLjA3IDI2Ljk5IDQxLjU4IDI1LjA5IDQxLjU4SDIuOTEgQzEuMDEgNDEuNTggMCA0MC4wNyAwIDM4LjE4VjMuMzFDMCAxLjQyIDEuMDEgLTAuMDkgMi45MSAwLjA5SDIwLjY5VjE5LjI1SDE4Ljk5WiIgZmlsbD0iIzFFMzY4OCIvPgo8L3N2Zz4K'
        },
        duckduckgo: {
            name: 'DuckDuckGo',
            url: 'https://duckduckgo.com/?q={q}',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDBBNCA0IDAgMCAxIDE2IDRDMTYuNjYgNCAxOSAyLjM0IDE5IDRDMTkgNS42NiAxNi42NiA4IDEzIDhDMTAuMjMgOCAxMCA5LjIzIDEwIDEyQzEwIDE0Ljc3IDEyLjIzIDE3IDE1IDE3QzE3Ljc3IDE3IDE5IDE0Ljc3IDE5IDEyQzE5IDkuMjMgMTYuNzcgNyAxNCA3QzEyLjIzIDcgMTAgOS4yMyAxMCAxMkMxMCAxNC43NyAxMi4yMyAxNyAxNSAxN0MxNy43NyAxNyAxOSAxNC43NyAxOSA5QzE5IDUuNjYgMTYuNjYgMyAxMyAzQzEwLjIzIDMgNyA1LjIzIDcgOUM3IDEwLjY2IDkuMzQgMTIuOTcgMTEuODMgMTQuMjRDMTAuNzQgMTUuNTMgOSAxNy4zNCA5IDIwQzkgMjIuNTMgMTAuOTcgMjQgMTMgMjRDMTUuMDMgMjQgMTcgMjIuMDMgMTcgMTlBNCA0IDAgMCAxIDE3IDFDMTcgLTAuMzcgMTQuNjMgLTIgMTIgLTJBNCA0IDAgMCAxIDggMUM4IDEuNjMgOS4zNCAzLjM3IDEwLjgzIDQuNzZDOS43NCA2LjAzIDggNy44IDggMTFDMCAxMi42NyAyLjMzIDE0IDE1IDE0QzE3LjY3IDE0IDIwIDEyLjY3IDIwIDlBNCA0IDAgMCAxIDE2IDVDMTMuMzQgNSAxMiA0LjM0IDEyIDJBNCA0IDAgMCAwIDEyIDB6IiBmaWxsPSIjREREMzM4Ii8+Cjwvc3ZnPgo='
        },
        baidu: {
            name: '百度',
            url: 'https://www.baidu.com/s?wd={q}',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDBBNCA0IDAgMCAxIDE2IDRDMTYuNjYgNCAxOSAyLjM0IDE5IDRDMTkgNS42NiAxNi42NiA4IDEzIDhDMTAuMjMgOCAxMCA5LjIzIDEwIDEyQzEwIDE0Ljc3IDEyLjIzIDE3IDE1IDE3QzE3Ljc3IDE3IDE5IDE0Ljc3IDE5IDEyQzE5IDkuMjMgMTYuNzcgNyAxNCA3QzEyLjIzIDcgMTAgOS4yMyAxMCAxMkMxMCAxNC43NyAxMi4yMyAxNyAxNSAxN0MxNy43NyAxNyAxOSAxNC43NyAxOSA5QzE5IDUuNjYgMTYuNjYgMyAxMyAzQzEwLjIzIDMgNyA1LjIzIDcgOUM3IDEwLjY2IDkuMzQgMTIuOTcgMTEuODMgMTQuMjRDMTAuNzQgMTUuNTMgOSAxNy4zNCA5IDIwQzkgMjIuNTMgMTAuOTcgMjQgMTMgMjRDMTUuMDMgMjQgMTcgMjIuMDMgMTcgMTlBNCA0IDAgMCAxIDE3IDFDMTcgLTAuMzcgMTQuNjMgLTIgMTIgLTJBNCA0IDAgMCAxIDggMUM4IDEuNjMgOS4zNCAzLjM3IDEwLjgzIDQuNzZDOS43NCA2LjAzIDggNy44IDggMTFDMCAxMi42NyAyLjMzIDE0IDE1IDE0QzE3LjY3IDE0IDIwIDEyLjY3IDIwIDlBNCA0IDAgMCAxIDE2IDVDMTMuMzQgNSAxMiA0LjM0IDEyIDJBNCA0IDAgMCAwIDEyIDB6IiBmaWxsPSIjREUwRTQyIi8+Cjwvc3ZnPgo='
        },
        bing: {
            name: 'Bing',
            url: 'https://www.bing.com/search?q={q}',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDJIMTVWMUg5VjJIMVYySDlWMUgxNVYyaDE0VjI0SDE5VjIzSDE5VjJIMTl6IiBmaWxsPSIjMDA4MkFFIi8+Cjwvc3ZnPgo='
        }
    };

    // 获取/设置用户配置
    let userEngines = GM_getValue('userEngines', defaultEngines);
    let defaultDisplay = GM_getValue('defaultDisplay', ['google', 'yandex', 'duckduckgo']); // 默认展示前三个

    // 动态检测当前Google TLD
    function getCurrentGoogleTLD() {
        const hostname = window.location.hostname;
        const match = hostname.match(/google\.([a-z]{2,3}(\.[a-z]{2})?)/);
        return match ? match[1] : 'com';
    }

    // 更新Google URL以匹配当前TLD
    function updateGoogleURL(engines) {
        const tld = getCurrentGoogleTLD();
        if (engines.google) {
            engines.google.url = `https://www.google.${tld}/search?q={q}`;
            engines.google.tld = tld;
        }
        return engines;
    }

    userEngines = updateGoogleURL(userEngines);

    // 找到搜索输入框
    function findSearchInput() {
        const selectors = [
            'input[name="q"]',
            'input[name="search"]',
            'input[type="search"]',
            '#search-input',
            '#lst-ib',
            '#kw', // Baidu
            'textarea[name="q"]' // Some engines
        ];
        for (let selector of selectors) {
            const input = document.querySelector(selector);
            if (input && (input.type === 'text' || input.type === 'search' || input.tagName === 'TEXTAREA')) {
                return input;
            }
        }
        return null;
    }

    // 获取当前查询词
    function getQuery() {
        const input = findSearchInput();
        return input ? input.value.trim() || new URLSearchParams(window.location.search).get('q') || new URLSearchParams(window.location.search).get('wd') || '' : '';
    }

    // 创建快捷链接容器
    function createSwitcher() {
        const input = findSearchInput();
        if (!input) {
            console.warn('未找到搜索输入框，跳过插入快捷链接。');
            return; // 如果未定位到输入框，避免错乱
        }

        // 检查是否已存在
        if (document.getElementById('engine-switcher')) return;

        const switcher = document.createElement('div');
        switcher.id = 'engine-switcher';
        switcher.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 10px 0;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 8px;
            flex-wrap: wrap;
            max-width: 100%;
            box-sizing: border-box;
        `; // 手机友好：flex wrap, responsive

        // 插入到输入框下方
        input.parentNode.insertBefore(switcher, input.nextSibling);

        // 添加引擎按钮
        const query = getQuery();
        defaultDisplay.forEach(key => {
            if (userEngines[key]) {
                const engine = userEngines[key];
                const btn = document.createElement('a');
                btn.href = engine.url.replace('{q}', encodeURIComponent(query));
                btn.target = '_self'; // 同窗口跳转
                btn.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-decoration: none;
                    color: #333;
                    padding: 5px;
                    border-radius: 4px;
                    transition: background 0.2s;
                `;
                btn.onmouseover = () => btn.style.background = '#e9ecef';
                btn.onmouseout = () => btn.style.background = 'transparent';

                const img = document.createElement('img');
                img.src = engine.logo;
                img.style.width = '24px';
                img.style.height = '24px';

                const name = document.createElement('span');
                name.textContent = engine.name;
                name.style.fontSize = '12px';
                name.style.marginTop = '2px';

                btn.appendChild(img);
                btn.appendChild(name);
                switcher.appendChild(btn);
            }
        });

        // 添加设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '设置';
        settingsBtn.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        settingsBtn.onclick = openSettings;
        switcher.appendChild(settingsBtn);
    }

    // 打开设置对话框
    function openSettings() {
        const enginesList = Object.keys(userEngines).map(key => `${key}: ${userEngines[key].name}`).join('\n');
        const newEngineName = prompt('添加新引擎？输入名称:');
        if (newEngineName) {
            const newUrl = prompt('输入URL模板 (用{q}替换查询):');
            if (newUrl) {
                const newLogo = prompt('输入Logo URL或base64 (可选，留空用默认):') || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiPjwvc3ZnPg==';
                const key = newEngineName.toLowerCase().replace(/\s+/g, '');
                userEngines[key] = { name: newEngineName, url: newUrl, logo: newLogo };
                GM_setValue('userEngines', userEngines);
            }
        }

        const displayStr = defaultDisplay.join(',');
        const newDisplay = prompt('默认展示引擎 (逗号分隔键，如google,yandex):', displayStr);
        if (newDisplay) {
            defaultDisplay = newDisplay.split(',').map(s => s.trim());
            GM_setValue('defaultDisplay', defaultDisplay);
        }

        // 重新加载页面以应用
        location.reload();
    }

    // 关键词高亮功能 (参考原项目：使用MutationObserver监听结果变化，高亮查询词)
    function initHighlight() {
        const query = getQuery();
        if (!query) return;

        const highlightStyle = GM_addStyle(`
            .highlight { background-color: yellow; font-weight: bold; }
        `);

        function highlightText(node) {
            if (node.nodeType === 3) { // Text node
                const text = node.textContent;
                const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                if (regex.test(text)) {
                    const span = document.createElement('span');
                    span.innerHTML = text.replace(regex, '<mark class="highlight">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else {
                for (let child of node.childNodes) {
                    highlightText(child);
                }
            }
        }

        // 初始高亮结果区域
        const resultsSelectors = [
            '.g', // Google
            '.result', // Bing/Baidu
            '.result__body', // DDG
            '.serp-item' // Yandex
        ];
        resultsSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => highlightText(el));
        });

        // 监听动态变化 (AJAX加载)
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element
                        highlightText(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 手机优化CSS
    GM_addStyle(`
        @media (max-width: 768px) {
            #engine-switcher {
                gap: 5px;
                padding: 5px;
            }
            #engine-switcher a span {
                font-size: 10px;
            }
        }
    `);

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createSwitcher, 1000); // 延迟以确保输入框加载
            initHighlight();
        });
    } else {
        setTimeout(createSwitcher, 1000);
        initHighlight();
    }

    // 监听输入变化更新链接 (实时)
    const input = findSearchInput();
    if (input) {
        const updateLinks = () => {
            const query = input.value.trim();
            document.querySelectorAll('#engine-switcher a').forEach((a, i) => {
                const key = defaultDisplay[i];
                if (userEngines[key]) {
                    a.href = userEngines[key].url.replace('{q}', encodeURIComponent(query));
                }
            });
        };
        input.addEventListener('input', updateLinks);
    }
})();
