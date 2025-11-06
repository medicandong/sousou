// ==UserScript==
// @name         移动端搜索引擎快速切换助手
// @namespace    https://github.com/yourname/search-switcher-mobile
// @version      1.0
// @description  在搜索框下方添加搜索引擎快捷跳转按钮，支持自定义设置和关键词高亮
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

  const userEngines = GM_getValue('customEngines', defaultEngines.slice(0, 3));

  function getQuery() {
    const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"]');
    return input ? input.value.trim() : '';
  }

  function createEngineButtons(query) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      padding: 4px;
      background: #f9f9f9;
      border-radius: 6px;
      align-items: center;
      justify-content: flex-start;
      font-size: 14px;
    `;

    userEngines.forEach(engine => {
      const link = document.createElement('a');
      link.href = engine.url.replace('{query}', encodeURIComponent(query));
      link.target = '_blank';
      link.style.cssText = 'display: flex; align-items: center; text-decoration: none; color: #333;';

      const img = document.createElement('img');
      img.src = engine.logo;
      img.alt = engine.name;
      img.style.cssText = 'width: 16px; height: 16px; margin-right: 4px;';

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
        el.innerHTML = el.textContent.replace(regex, '<mark>$1</mark>');
      }
    });
  }

  function injectButtons() {
    const query = getQuery();
    if (!query) return;

    const input = document.querySelector('input[type="search"], input[name="q"], input[name="wd"]');
    if (!input) return;

    const placeholder = document.createElement('div');
    placeholder.id = 'search-switcher-placeholder';
    placeholder.style.cssText = 'margin-top: 4px;';
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
  }

  setupMenu();
  window.addEventListener('load', injectButtons);
})();
