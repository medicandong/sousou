// ==UserScript==
// @name         手机端快捷搜索引擎助手
// @namespace    https://github.com/yourname
// @version      1.0.0
// @description  搜索框下方快速切换引擎 / 关键词高亮 / 可视化设置
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /* ============ 1.  内置引擎数据 ============ */
  const ENGINE_DB = [
    {
      key: 'google',
      name: 'Google',
      logo: 'https://www.google.com/favicon.ico',
      searchUrl: 'https://www.google.com/search?q={q}',
      mirrors: ['https://www.google.com/search?q={q}', 'https://www.google.com.hk/search?q={q}', 'https://www.google.co.jp/search?q={q}']
    },
    {
      key: 'bing',
      name: 'Bing',
      logo: 'https://www.bing.com/favicon.ico',
      searchUrl: 'https://www.bing.com/search?q={q}',
      mirrors: ['https://www.bing.com/search?q={q}', 'https://cn.bing.com/search?q={q}']
    },
    {
      key: 'duckduckgo',
      name: 'DuckDuckGo',
      logo: 'https://duckduckgo.com/favicon.ico',
      searchUrl: 'https://duckduckgo.com/?q={q}'
    },
    {
      key: 'yandex',
      name: 'Yandex',
      logo: 'https://yandex.com/favicon.ico',
      searchUrl: 'https://yandex.com/search/?text={q}'
    },
    {
      key: 'baidu',
      name: '百度',
      logo: 'https://www.baidu.com/favicon.ico',
      searchUrl: 'https://www.baidu.com/s?wd={q}'
    }
  ];

  /* ============ 2.  工具函数 ============ */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  /* 获取当前所在搜索引擎 */
  function detectCurrentEngine() {
    const host = location.hostname;
    if (/google\./.test(host)) return 'google';
    if (/bing\./.test(host)) return 'bing';
    if (/duckduckgo\./.test(host)) return 'duckduckgo';
    if (/yandex\./.test(host)) return 'yandex';
    if (/baidu\./.test(host)) return 'baidu';
    return '';
  }

  /* 获取搜索框关键字 */
  function getQuery() {
    const q = new URLSearchParams(location.search).get('q') || new URLSearchParams(location.search).get('wd') || '';
    return decodeURIComponent(q);
  }

  /* 高亮关键词 */
  function highlightKeyword(keyword) {
    if (!keyword) return;
    const walk = (node) => {
      if (node.nodeType === 3) {
        const txt = node.textContent;
        const reg = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        if (reg.test(txt)) {
          const span = document.createElement('span');
          span.innerHTML = txt.replace(reg, '<mark style="background:#ffeb3b;color:#000;">$1</mark>');
          node.parentNode.replaceChild(span, node);
        }
      } else {
        node.childNodes.forEach(walk);
      }
    };
    $$('body *').forEach(el => walk(el));
  }

  /* ============ 3.  面板样式 ============ */
  const STYLE = `
  #quickEngineBar{
    position:relative;
    margin:8px 0 12px;
    display:flex;
    gap:10px;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
    padding-bottom:4px;
  }
  #quickEngineBar::-webkit-scrollbar{height:4px;}
  #quickEngineBar::-webkit-scrollbar-thumb{background:#ccc;border-radius:2px;}
  .qe-btn{
    flex:0 0 auto;
    display:flex;align-items:center;
    background:#fff;
    border:1px solid #dfe1e5;
    border-radius:20px;
    padding:6px 10px;
    font-size:14px;
    color:#202124;
    text-decoration:none;
    white-space:nowrap;
  }
  .qe-btn img{width:16px;height:16px;margin-right:6px;}
  .qe-btn:active{background:#f1f3f4;}
  #qeSettings{
    position:fixed;
    top:10px;right:10px;z-index:9999;
    background:#fff;
    border:1px solid #dadce0;
    border-radius:8px;
    padding:12px;
    width:260px;
    box-shadow:0 4px 12px rgba(0,0,0,.15);
    font-size:14px;
    display:none;
  }
  #qeSettings h4{margin:0 0 8px;font-size:16px;}
  #qeSettings label{display:block;margin-bottom:6px;}
  #qeSettings input[type=text]{width:100%;padding:4px 6px;margin-top:4px;}
  #qeSettings button{margin-top:8px;margin-right:6px;}
  `;

  /* ============ 4.  核心逻辑 ============ */
  function buildBar() {
    const current = detectCurrentEngine();
    const keyword = getQuery();
    if (!keyword) return;

    const selectedKeys = GM_getValue('selectedEngines', ['google', 'yandex', 'duckduckgo']);
    const customEngines = GM_getValue('customEngines', []);
    const all = [...ENGINE_DB, ...customEngines];

    const bar = document.createElement('div');
    bar.id = 'quickEngineBar';
    all.filter(e => selectedKeys.includes(e.key) && e.key !== current)
      .forEach(e => {
        const url = (e.mirrors ? e.mirrors[GM_getValue('mirror_' + e.key, 0)] : e.searchUrl).replace('{q}', encodeURIComponent(keyword));
        const a = document.createElement('a');
        a.className = 'qe-btn';
        a.href = url;
        a.innerHTML = `<img src="${e.logo}" onerror="this.src='https://www.google.com/favicon.ico'">${e.name}`;
        bar.appendChild(a);
      });

    /* 插入位置：搜索框下方（Google / Bing / DDG / Yandex / Baidu 均测试过） */
    let anchor =
      $('form[role="search"], form#searchform, form[action*="/search"], .search-form, #search-form') ||
      $('input[name="q"], input[name="wd"]').closest('form');
    if (anchor) {
      anchor.parentNode.insertBefore(bar, anchor.nextSibling);
      highlightKeyword(keyword);
    }
  }

  /* ============ 5.  设置面板 ============ */
  function openSettings() {
    let panel = $('#qeSettings');
    if (panel) { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; return; }

    panel = document.createElement('div');
    panel.id = 'qeSettings';
    panel.innerHTML = `
      <h4>快捷搜索设置</h4>
      <div id="qeList"></div>
      <div>
        <label>自定义名称<br><input id="custName" placeholder="例如：搜狗"></label>
        <label>自定义搜索链接（用 {q} 代替关键词）<br><input id="custUrl" placeholder="https://www.sogou.com/web?query={q}"></label>
        <button id="addBtn">添加</button>
      </div>
      <button id="saveBtn">保存</button>
    `;
    document.body.appendChild(panel);

    function renderList() {
      const selected = GM_getValue('selectedEngines', ['google', 'yandex', 'duckduckgo']);
      const customEngines = GM_getValue('customEngines', []);
      const all = [...ENGINE_DB, ...customEngines];
      $('#qeList').innerHTML = all.map(e => `
        <label><input type="checkbox" data-key="${e.key}" ${selected.includes(e.key)?'checked':''}> ${e.name}</label>
        ${e.mirrors?`<select data-mirror="${e.key}">${e.mirrors.map((u,i)=>`<option value="${i}" ${GM_getValue('mirror_'+e.key,0)==i?'selected':''}>镜像${i+1}</option>`).join('')}</select>`:''}
      `).join('');
    }
    renderList();

    $('#addBtn').onclick = () => {
      const name = $('#custName').value.trim();
      const url = $('#custUrl').value.trim();
      if (!name || !url || !url.includes('{q}')) return alert('名称和链接必填，且链接须包含 {q}');
      const custom = GM_getValue('customEngines', []);
      custom.push({ key: 'cust_' + Date.now(), name, logo: 'https://www.google.com/favicon.ico', searchUrl: url });
      GM_setValue('customEngines', custom);
      $('#custName').value = ''; $('#custUrl').value = '';
      renderList();
    };

    $('#saveBtn').onclick = () => {
      const checked = $$('#qeList input[type=checkbox]:checked').map(i => i.dataset.key);
      GM_setValue('selectedEngines', checked);
      $$('#qeList select').forEach(s => GM_setValue('mirror_' + s.dataset.mirror, s.value));
      panel.style.display = 'none';
      location.reload();
    };
  }

  /* ============ 6.  入口 ============ */
  function init() {
    if (!GM_getValue('selectedEngines')) GM_setValue('selectedEngines', ['google', 'yandex', 'duckduckgo']);
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    buildBar();
    GM_registerMenuCommand('⚙️ 搜索引擎设置', openSettings);
  }

  init();
})();
