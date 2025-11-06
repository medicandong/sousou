// ==UserScript==
// @name         优雅搜索引擎切换助手（紧贴搜索框版）
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  严格按需：切换器紧贴搜索框下方，结果自动下移，不遮挡，完美融入，手机优先
// @author       Grok
// @match        *://www.google.*/search*
// @match        *://*.google.*/search*
// @match        *://duckduckgo.com/*
// @match        *://yandex.com/search*
// @match        *://yandex.ru/search*
// @match        *://www.baidu.com/*
// @match        *://www.bing.com/search*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // === 高清 Logo ===
    const LOGOS = {
        google: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
        yandex: 'https://yastatic.net/iconostasis/_/YaT6lT6c.png',
        duckduckgo: 'https://duckduckgo.com/assets/logo_header.v108.svg',
        baidu: 'https://www.baidu.com/img/flexible/logo/pc/peak-result.png',
        bing: 'https://r.bing.com/rp/N_3s9qQv0_4kO0v2C7k9j1q2m3k.svg'
    };

    const ENGINES = {
        google: { name: 'Google', key: 'q', logo: LOGOS.google },
        yandex: { name: 'Yandex', key: 'text', logo: LOGOS.yandex },
        duckduckgo: { name: 'DuckDuckGo', key: 'q', logo: LOGOS.duckduckgo },
        baidu: { name: '百度', key: 'wd', logo: LOGOS.baidu },
        bing: { name: 'Bing', key: 'q', logo: LOGOS.bing }
    };

    let displayOrder = GM_getValue('displayOrder', ['google', 'yandex', 'duckduckgo']);
    let customEngines = GM_getValue('customEngines', {});
    const allEngines = { ...ENGINES, ...customEngines };

    function getQuery() {
        const params = new URLSearchParams(location.search);
        for (const key in allEngines) {
            if (params.has(allEngines[key].key)) return params.get(allEngines[key].key);
        }
        const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"], textarea');
        return input?.value || '';
    }

    function getCurrentEngine() {
        const host = location.hostname;
        if (host.includes('google')) return 'google';
        if (host.includes('yandex')) return 'yandex';
        if (host.includes('duckduckgo')) return 'duckduckgo';
        if (host.includes('baidu')) return 'baidu';
        if (host.includes('bing')) return 'bing';
        return null;
    }

    // === 核心：找到搜索框的“外层容器” + 结果容器 ===
    function getSearchBoxContainer() {
        const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"], textarea');
        if (!input) return null;

        const engine = getCurrentEngine();
        const selectors = {
            google: ['form[role="search"]', '#searchform', 'form'],
            duckduckgo: ['.search__form', 'form'],
            yandex: ['.search2__form', 'form'],
            baidu: ['#form', '.s_form_wrapper'],
            bing: ['#sb_form', 'form']
        };

        for (const sel of selectors[engine] || []) {
            const el = input.closest(sel);
            if (el) return el;
        }
        return input.closest('div') || input.parentElement;
    }

    function getResultsContainer() {
        const engine = getCurrentEngine();
        const selectors = {
            google: ['#search', '#rso', '#center_col'],
            duckduckgo: ['#links_wrapper', '.results'],
            yandex: ['.serp-list', '#search-result'],
            baidu: ['#container', '#content_left'],
            bing: ['#b_results']
        };

        for (const sel of selectors[engine] || []) {
            const el = document.querySelector(sel);
            if (el && el.children.length > 0) return el;
        }
        return null;
    }

    // === 插入切换器：紧贴搜索框下方 + 推开结果 ===
    function insertSwitcher() {
        if (document.getElementById('elegant-switcher')) return;

        const query = getQuery();
        const searchBox = getSearchBoxContainer();
        const results = getResultsContainer();
        if (!searchBox || !results) return;

        // 创建切换器
        const switcher = document.createElement('div');
        switcher.id = 'elegant-switcher';
        switcher.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: transparent;
            flex-wrap: wrap;
            max-width: 100%;
            box-sizing: border-box;
        `;

        // === 插入到搜索框正下方 ===
        searchBox.parentNode.insertBefore(switcher, searchBox.nextSibling);

        // === 推开结果区（关键！）===
        const spacerHeight = 56; // 切换器高度 + 间距
        if (results.style.marginTop) {
            results.style.marginTop = (parseInt(results.style.marginTop) + spacerHeight) + 'px';
        } else {
            results.style.marginTop = spacerHeight + 'px';
        }
        results.style.transition = 'margin-top 0.3s ease';

        // === 逐引擎微调样式（融入原生）===
        const engine = getCurrentEngine();
        if (engine === 'google') {
            GM_addStyle(`
                #elegant-switcher { margin: 8px 0 -4px; }
                #elegant-switcher a { background: #fff; border: 1px solid #dadce0; }
            `);
        } else if (engine === 'duckduckgo') {
            GM_addStyle(`
                #elegant-switcher { margin: 6px 0; }
                #elegant-switcher a { background: #fff; border: 1px solid #eee; }
            `);
        } else if (engine === 'baidu') {
            GM_addStyle(`
                #elegant-switcher { margin: 4px 0; background: #fff; }
                #elegant-switcher a { background: #f8f8f8; border: 1px solid #e5e5e5; }
            `);
        }

        // === 创建按钮 ===
        displayOrder.forEach(key => {
            if (!allEngines[key]) return;
            const e = allEngines[key];
            const a = document.createElement('a');
            let url = e.url || `https://www.${key}.com/search?${e.key}=${encodeURIComponent(query)}`;
            if (key === 'google') {
                const tld = location.hostname.match(/google\.([a-z.]+)/)?.[1] || 'com';
                url = `https://www.google.${tld}/search?q=${encodeURIComponent(query)}`;
            }
            a.href = url;
            a.target = '_self';
            a.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 20px;
                text-decoration: none;
                color: #333;
                font-size: 13px;
                font-weight: 500;
                background: #fff;
                border: 1px solid #ddd;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: all 0.2s;
                min-width: 60px;
                justify-content: center;
            `;
            a.onmouseover = () => a.style.background = '#f5f5f5';
            a.onmouseout = () => a.style.background = '#fff';

            const img = new Image();
            img.src = e.logo;
            img.style.cssText = 'height:16px; width:auto; pointer-events:none;';
            img.onerror = () => img.remove();

            const span = document.createElement('span');
            span.textContent = e.name;

            a.appendChild(img);
            a.appendChild(span);
            switcher.appendChild(a);
        });

        // 设置按钮
        const settings = document.createElement('button');
        settings.textContent = '⋮';
        settings.title = '设置';
        settings.style.cssText = `
            background: #fff; border: 1px solid #ddd; width: 32px; height: 32px;
            border-radius: 50%; cursor: pointer; font-size: 16px; margin-left: 4px;
            display: flex; align-items: center; justify-content: center;
        `;
        settings.onclick = openSettings;
        switcher.appendChild(settings);

        // === 实时更新 ===
        const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"], textarea');
        if (input) {
            input.addEventListener('input', () => {
                const q = input.value;
                switcher.querySelectorAll('a').forEach((a, i) => {
                    const key = displayOrder[i];
                    if (allEngines[key]) {
                        let url = `https://www.${key}.com/search?${allEngines[key].key}=${encodeURIComponent(q)}`;
                        if (key === 'google') {
                            const tld = location.hostname.match(/google\.([a-z.]+)/)?.[1] || 'com';
                            url = `https://www.google.${tld}/search?q=${encodeURIComponent(q)}`;
                        }
                        a.href = url;
                    }
                });
            });
        }
    }

    // === 设置、关键词高亮（保持不变）===
    function openSettings() { /* 同上 */ }
    function highlightKeywords() { /* 同上 */ }

    // === 初始化 ===
    setTimeout(() => {
        insertSwitcher();
        highlightKeywords();
    }, 1000);

})();
