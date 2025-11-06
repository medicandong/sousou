// ==UserScript==
// @name         移动端搜索引擎助手
// @namespace    https://github.com/yourname/search-switcher-mobile
// @version      1.0
// @description  搜索框下方添加搜索引擎快捷跳转按钮，支持自定义设置和关键词高亮，自动排除当前搜索引擎，适配移动端页面结构
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  const defaultEngines = [
    { name: 'Google', logo: 'https://www.google.com/favicon.ico', url: 'https://www.google.com/search?q={query}' },
    { name: 'Yandex', logo: 'https://yandex.com/favicon.ico', url: 'https://yandex.com/search/?text={query}' },
    { name: 'DuckDuckGo', logo: 'https://duckduckgo.com/favicon.ico', url: 'https://duckduckgo.com/?q={query}' },
    { name: 'Bing', logo: 'https://www.bing.com/favicon.ico', url: 'https://www.bing.com/search?q={query}' },
    { name: '百度', logo: 'https://www.baidu.com/favicon.ico', url: 'https://www.baidu.com/s?wd={query}' }
  ];

  function detectCurrentEngine() {
    const host = window.location.hostname;
    if (/google\./.test(host)) return 'Google';
    if (/bing\./.test(host)) return 'Bing';
    if (/baidu\./.test(host)) return '百度';
    if (/yandex\./.test(host)) return 'Yandex';
    if (/duckduckgo\.com/.test(host)) return 'DuckDuckGo';
    return null;
  }

  function getQuery() {
    const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"]');
    return input ? input.value.trim() : '';
  }

  function createEngineButtons(query) {
    const currentEngine = detectCurrentEngine();
    const userEngines = GM_getValue('customEngines', defaultEngines.slice(0, 3));
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      padding: 6px;
      background: #f1f1f1;
      border-radius: 8px;
      align-items: center;
      justify-content: flex-start;
      font-size: 14px;
      z-index: 9999;
    `;

    userEngines
      .filter(engine => engine.name !== currentEngine)
      .forEach(engine => {
        const link = document.createElement('a');
        link.href = engine.url.replace('{query}', encodeURIComponent(query));
        link.target = '_blank';
        link.style.cssText = 'display: flex; align-items: center; text-decoration: none; color: #333; padding: 4px 6px; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

        const img = document.createElement('img');
        img.src = engine.logo;
        img.alt = engine.name;
        img.style.cssText = 'width: 16px; height: 16px; margin-right: 6px;';

        link.appendChild(img);
        link.appendChild(document.createTextNode(engine.name));
        container.appendChild(link);
      });

    return container;
  }

  function highlightKeywords(query) {
    if (!query) return;
    const keywords = query.split(/\s+/);
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    document.querySelectorAll('p, span, a, div').forEach(el => {
      if (el.children.length === 0 && el.textContent.match(regex)) {
        el.innerHTML = el.textContent.replace(regex, '<mark style="background:yellow;">$1</mark>');
      }
    });
  }

  function injectButtons() {
    const query = getQuery();
    if (!query) return;

    const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"]');
    if (!input || document.getElementById('search-switcher-placeholder')) return;

    const placeholder = document.createElement('div');
    placeholder.id = 'search-switcher-placeholder';
    placeholder.style.cssText = 'margin-top: 6px;';
    input.parentNode.insertBefore(placeholder, input.nextSibling);

    const buttons = createEngineButtons(query);
    placeholder.appendChild(buttons);

    highlightKeywords(query);
  }

  function setupMenu() {
    GM_registerMenuCommand('设置默认搜索引擎', () => {
      const selected = prompt('请输入要展示的搜索引擎名称（用逗号分隔）\n可选项：Google,Yandex,DuckDuckGo,Bing,百度');
      if (!selected) return;
      const names = selected.split(',').map(n => n.trim());
      const newEngines = defaultEngines.filter(e => names.includes(e.name));
      GM_setValue('customEngines', newEngines);
      alert('设置已保存，请刷新页面');
    });

    GM_registerMenuCommand('添加自定义搜索引擎', () => {
      const name = prompt('搜索引擎名称：');
      const logo = prompt('图标地址（favicon）：');
      const url = prompt('搜索链接模板（用 {query} 作为关键词占位）：');
      if (name && logo && url) {
        const custom = GM_getValue('customEngines', defaultEngines.slice(0, 3));
        custom.push({ name, logo, url });
        GM_setValue('customEngines', custom);
        alert('自定义搜索引擎已添加，请刷新页面');
      }
    });
  }

  setupMenu();
  window.addEventListener('load', injectButtons);
})();
