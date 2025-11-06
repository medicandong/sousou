// ==UserScript==
// @name         优雅搜索引擎切换助手（智能隐藏当前引擎）
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  自动隐藏当前引擎，优先展示其他三大主流引擎，紧贴搜索框下方，结果下移，手机完美适配
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

    // === 基础引擎配置 ===
    const ENGINES = {
        google: { name: 'Google', key: 'q', logo: LOGOS.google },
        yandex: { name: 'Yandex', key: 'text', logo: LOGOS.yandex },
        duckduckgo: { name: 'DuckDuckGo', key: 'q', logo: LOGOS.duckduckgo },
        baidu: { name: '百度', key: 'wd', logo: LOGOS.baidu },
        bing: { name: 'Bing', key: 'q', logo: LOGOS.bing }
    };

    let customEngines = GM_getValue('customEngines', {});
    const allEngines = { ...ENGINES, ...customEngines };

    // === 智能获取展示顺序：隐藏当前引擎，优先展示三大主流 ===
    function getSmartDisplayOrder() {
        const current = getCurrentEngine();
        const major = ['google', 'bing', 'yandex', 'duckduckgo'];
        const others = major.filter(e => e !== current);
        // 优先：Bing/Google 互换，Yandex/DDG 保持
        if (current === 'google') return ['bing', 'yandex', 'duckduckgo'];
        if (current === 'bing') return ['google', 'yandex', 'duckduckgo'];
        if (current === 'duckduckgo') return ['google', 'yandex', 'bing'];
        if (current === 'yandex') return ['google', 'bing', 'duckduckgo'];
        if (current === 'baidu') return ['google', 'bing', 'duckduckgo'];
        return others.slice(0, 3);
    }

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

    // === 精准定位容器 ===
    function getSearchBoxContainer() {
        const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"], textarea[aria-label*="搜索"], textarea[name="q"]');
        if (!input) return null;

        const engine = getCurrentEngine();
        const selectors = {
            google: ['form[role="search"]', '#searchform', 'form[action="/search"]'],
            duckduckgo: ['.search__form', 'form'],
            yandex: ['.search2__form', 'form[action*="search"]'],
            baidu: ['#form', '.s_form_wrapper', 'form'],
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
            google: ['#search', '#rso', '#center_col', '[data-async-context]'],
            duckduckgo: ['#links_wrapper', '.results'],
            yandex: ['.serp-list', '#search-result'],
            baidu: ['#container', '#content_left'],
            bing: ['#b_results']
        };

        for (const sel of selectors[engine] || []) {
            const el = document.querySelector(sel);
            if (el && el.children && el.children.length > 0) return el;
        }
        return null;
    }

    // === 插入切换器 ===
    function insertSwitcher() {
        if (document.getElementById('elegant-switcher')) return;

        const searchBox = getSearchBoxContainer();
        const results = getResultsContainer();
        if (!searchBox || !results) return;

        const query = getQuery();
        const displayOrder = getSmartDisplayOrder(); // 智能顺序

        const switcher = document.createElement('div');
        switcher.id = 'elegant-switcher';
        switcher.style.cssText = `
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: transparent;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            max-width: 100%;
            box-sizing: border-box;
        `;
        switcher.style['-webkit-overflow-scrolling'] = 'touch';
        switcher.innerHTML += '<style>#elegant-switcher::-webkit-scrollbar{display:none}</style>';

        searchBox.parentNode.insertBefore(switcher, searchBox.nextSibling);
        results.style.marginTop = (parseInt(getComputedStyle(results).marginTop) || 0) + 52 + 'px';
        results.style.transition = 'margin-top 0.3s ease';

        const fragment = document.createDocumentFragment();

        // === 引擎按钮 ===
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
                display: flex; align-items: center; gap: 6px; padding: 6px 12px;
                border-radius: 20px; text-decoration: none; color: #333;
                font-size: 13px; font-weight: 500; background: #fff;
                border: 1px solid #e0e0e0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
            `;
            a.onmouseover = () => a.style.background = '#f8f9fa';
            a.onmouseout = () => a.style.background = '#fff';

            const img = new Image();
            img.src = e.logo;
            img.style.cssText = 'height:16px; width:auto; pointer-events:none;';
            img.onerror = () => img.remove();

            const span = document.createElement('span');
            span.textContent = e.name;

            a.appendChild(img);
            a.appendChild(span);
            fragment.appendChild(a);
        });

        // === 设置按钮（靠右）===
        const settings = document.createElement('button');
        settings.innerHTML = '⋮';
        settings.title = '设置搜索引擎';
        settings.style.cssText = `
            margin-left: auto;
            background: #fff; border: 1px solid #e0e0e0;
            width: 32px; height: 32px; border-radius: 50%;
            cursor: pointer; font-size: 16px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;
        `;
        settings.onclick = openSettings;
        fragment.appendChild(settings);

        switcher.appendChild(fragment);

        // === 实时更新 ===
        const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"], textarea');
        if (input) {
            const update = () => {
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
            };
            input.addEventListener('input', update);
            update();
        }
    }

    // === 设置（支持自定义）===
    function openSettings() {
        const current = getCurrentEngine();
        const smartOrder = getSmartDisplayOrder().join(', ');
        const promptText = `当前智能顺序：${smartOrder}\n\n如需固定顺序，请输入（逗号分隔）\n可用：${Object.keys(allEngines).join(', ')}`;

        const input = prompt(promptText, GM_getValue('fixedOrder', '') || '');
        if (input === null) return;

        if (input.trim() === '') {
            GM_setValue('fixedOrder', '');
            alert('已恢复智能顺序，页面刷新中...');
            setTimeout(() => location.reload(), 300);
            return;
        }

        const arr = input.split(',').map(s => s.trim()).filter(s => allEngines[s]);
        if (arr.length > 0) {
            GM_setValue('fixedOrder', arr.join(','));
            alert('固定顺序已保存，页面刷新中...');
            setTimeout(() => location.reload(), 300);
        }

        if (confirm('添加自定义搜索引擎？')) {
            const name = prompt('名称：');
            const domain = prompt('域名（如 example.com）：');
            const key = prompt('参数名（如 q）：');
            const logo = prompt('Logo URL（可留空）：') || '';
            if (name && domain && key) {
                const id = domain.replace(/[^a-z]/gi, '').toLowerCase();
                customEngines[id] = { name, key, url: `https://${domain}/search?${key}={q}`, logo };
                GM_setValue('customEngines', customEngines);
                alert('添加成功，页面刷新中...');
                setTimeout(() => location.reload(), 300);
            }
        }
    }

    // === 关键词高亮 ===
    function highlightKeywords() {
        const query = getQuery();
        if (!query) return;

        GM_addStyle(`
            .e-highlight {
                background: linear-gradient(180deg, #fffbe6 0%, #fff5c2 100%);
                padding: 0 3px; border-radius: 3px; font-weight: 500;
                box-decoration-break: clone;
            }
        `);

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: n => n.parentNode.closest('script,style,#elegant-switcher') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });

        const nodes = [];
        let node;
        while (node = walker.nextNode()) nodes.push(node);

        nodes.forEach(textNode => {
            if (regex.test(textNode.textContent)) {
                const span = document.createElement('span');
                span.innerHTML = textNode.textContent.replace(regex, '<mark class="e-highlight">$1</mark>');
                textNode.parentNode.replaceChild(span, textNode);
            }
        });

        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) {
                    const texts = Array.from(n.querySelectorAll('*'))
                        .flatMap(el => Array.from(el.childNodes).filter(c => c.nodeType === 3));
                    texts.forEach(textNode => {
                        if (regex.test(textNode.textContent)) {
                            const span = document.createElement('span');
                            span.innerHTML = textNode.textContent.replace(regex, '<mark class="e-highlight">$1</mark>');
                            textNode.parentNode.replaceChild(span, textNode);
                        }
                    });
                }
            }));
        }).observe(document.body, { childList: true, subtree: true });
    }

    // === 初始化 ===
    setTimeout(() => {
        insertSwitcher();
        highlightKeywords();
    }, 1200);

})();
