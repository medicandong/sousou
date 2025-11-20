// ==UserScript==
// @name         手机端快捷搜索助手（油猴干净版）
// @namespace    https://github.com/yourname
// @version      1.6.0
// @description  搜索框下方永远显示另外3个引擎 / 关键词高亮 / 可视化设置
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const ENGINE_DB = [
    {
      key: 'google',
      name: 'Google',
      logo: 'https://www.google.com/favicon.ico',
      searchUrl: 'https://www.google.com/search?q={q}',
      mirrors: [
        'https://www.google.com/search?q={q}',
        'https://www.google.com.hk/search?q={q}',
        'https://www.google.co.jp/search?q={q}'
      ]
    },
    {
      key: 'bing',
      name: 'Bing',
      logo: 'https://www.bing.com/favicon.ico',
      searchUrl: 'https://www.bing.com/search?q={q}',
      mirrors: [
        'https://www.bing.com/search?q={q}',
        'https://cn.bing.com/search?q={q}'
      ]
    },
    {
      key: 'yandex',
      name: 'Yandex',
      logo: 'https://yandex.com/favicon.ico',
      searchUrl: 'https://yandex.com/search/?text={q}'
    },
    {
    key: 'metaso',
    name: 'Metaso',
    logo: 'https://metaso.cn/favicon.ico',   // 秘塔的 favicon（可自行替换为更合适的图标）
    searchUrl: 'https://metaso.cn/?q={q}',
    mirrors: [
      // 如需国内镜像或备用地址，可在此添加
      // 示例：'https://cn.metaso.cn/?q={q}'
    ]
  }
  ];

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  function detectCurrentEngine() {
    const h = location.hostname;
    if (/^www\.google\./.test(h)) return 'google';
    if (/bing\.(com|cn)/.test(h)) return 'bing';
    if (/yandex\.(com|ru)/.test(h)) return 'yandex';
    if (/duckduckgo\.com/.test(h)) return 'duckduckgo';
    return '';
  }

  function getQuery() {
    const q = new URLSearchParams(location.search).get('q') ||
              new URLSearchParams(location.search).get('wd') ||
              new URLSearchParams(location.search).get('text') || '';
    return decodeURIComponent(q);
  }

  function highlightKeyword(keyword) {
    if (!keyword) return;
    const reg = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const walk = (n) => {
      if (n.nodeType === 3) {
        if (reg.test(n.textContent)) {
          const span = document.createElement('span');
          span.innerHTML = n.textContent.replace(reg, '<mark style="background:#ffeb3b;color:#000;">$1</mark>');
          n.parentNode.replaceChild(span, n);
        }
      } else {
        n.childNodes.forEach(walk);
      }
    };
    $$('body *').forEach(el => walk(el));
  }

  const STYLE = `
  #quickEngineBar{position:relative;margin:8px 0 12px;display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;}
  #quickEngineBar::-webkit-scrollbar{height:4px;}
  #quickEngineBar::-webkit-scrollbar-thumb{background:#ccc;border-radius:2px;}
  .qe-btn{flex:0 0 auto;display:flex;align-items:center;background:#fff;border:1px solid #dfe1e5;border-radius:20px;padding:6px 10px;font-size:14px;color:#202124;text-decoration:none;white-space:nowrap;}
  .qe-btn img{width:16px;height:16px;margin-right:6px;}
  .qe-btn:active{background:#f1f3f4;}
  #qeSettings{position:fixed;top:10px;right:10px;z-index:9999;background:#fff;border:1px solid #dadce0;border-radius:8px;padding:12px;width:260px;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:14px;display:none;}
  #qeSettings h4{margin:0 0 8px;font-size:16px;}
  #qeSettings label{display:block;margin-bottom:6px;}
  #qeSettings input[type=text]{width:100%;padding:4px 6px;margin-top:4px;}
  #qeSettings button{margin-top:8px;margin-right:6px;}
  `;

  function buildBar() {
    const kw = getQuery();
    if (!kw) return;
    const current = detectCurrentEngine();
    const selectedKeys = GM_getValue('selectedEngines', ['google', 'bing', 'yandex', 'duckduckgo']);
    const customEngines = GM_getValue('customEngines', []);
    const all = [...ENGINE_DB, ...customEngines];

    const oldBar = $('#quickEngineBar');
    if (oldBar) oldBar.remove();

    const bar = document.createElement('div');
    bar.id = 'quickEngineBar';
    all.filter(e => selectedKeys.includes(e.key) && e.key !== current)
       .forEach(e => {
         const url = (e.mirrors ? e.mirrors[GM_getValue('mirror_' + e.key, 0)] : e.searchUrl)
                     .replace('{q}', encodeURIComponent(kw));
         const a = document.createElement('a');
         a.className = 'qe-btn';
         a.href = url;
         a.innerHTML = `<img src="${e.logo}" onerror="this.src='https://www.google.com/favicon.ico'">${e.name}`;
         bar.appendChild(a);
       });

    const anchor =
      $('input[name="q"], input[name="wd"], input[name="text"]')?.closest('form') ||
      $('form[role="search"], form[action*="/search"]') ||
      $('#search-form') ||
      document.body;
    if (anchor) {
      if (anchor.nextSibling) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
      else anchor.parentNode.appendChild(bar);
      highlightKeyword(kw);
      return true;
    }
    return false;
  }

  function keepBarAlive() {
    setTimeout(() => {
      let retry = 0;
      const tryInsert = () => {
        if (buildBar() || retry++ > 20) return;
        setTimeout(tryInsert, 500);
      };
      tryInsert();
      const observer = new MutationObserver(() => {
        if (!document.contains($('#quickEngineBar'))) buildBar();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }, 1000);
  }

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
      const selected = GM_getValue('selectedEngines', ['google', 'bing', 'yandex', 'duckduckgo']);
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
      const url  = $('#custUrl').value.trim();
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

  function init() {
    if (!GM_getValue('selectedEngines')) GM_setValue('selectedEngines', ['google', 'bing', 'yandex', 'metaso']);
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    keepBarAlive();
    GM_registerMenuCommand('⚙️ 搜索引擎设置', openSettings);
  }

  init();
})();
