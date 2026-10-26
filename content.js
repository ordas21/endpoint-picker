'use strict';

// Isolated-world UI. The page bridge in inject.js owns the response buffer.
(function () {
  const SOURCE = 'endpoint-picker';
  const LIGHT_CSS = [
    '#endpoint-picker-root {',
    '  all: initial !important;',
    '  position: fixed !important;',
    '  z-index: 2147483647 !important;',
    '  top: 0 !important;',
    '  left: 0 !important;',
    '  width: 0 !important;',
    '  height: 0 !important;',
    '  overflow: visible !important;',
    '  pointer-events: none !important;',
    '}',
    'html.endpoint-picker-on, html.endpoint-picker-on * { cursor: crosshair !important; }',
  ].join('\n');

  const SHADOW_CSS = [
    ':host { color-scheme: dark; }',
    '[hidden] { display: none !important; }',
    '.box {',
    '  position: fixed;',
    '  box-sizing: border-box;',
    '  border: 1.5px solid #ff5a36;',
    '  background: rgba(255, 90, 54, 0.12);',
    '  pointer-events: none;',
    '}',
    '.tag {',
    '  position: fixed;',
    '  background: #ff5a36;',
    '  color: #1a0d09;',
    '  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
    '  padding: 2px 5px;',
    '  pointer-events: none;',
    '  white-space: nowrap;',
    '  max-width: 280px;',
    '  overflow: hidden;',
    '}',
    '.chip {',
    '  position: fixed;',
    '  top: 12px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  max-width: calc(100vw - 24px);',
    '  background: #102027;',
    '  color: #e7eef0;',
    '  border-left: 3px solid #ff5a36;',
    '  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);',
    '  padding: 8px 12px;',
    '  font: 12.5px/1.35 ui-sans-serif, system-ui, sans-serif;',
    '  pointer-events: none;',
    '}',
    '.panel {',
    '  position: fixed;',
    '  width: min(368px, calc(100vw - 16px));',
    '  max-height: min(70vh, 540px);',
    '  overflow: auto;',
    '  background: #102027;',
    '  color: #e7eef0;',
    '  border-left: 3px solid #ff5a36;',
    '  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38), 0 0 0 1px #2a4652;',
    '  font: 13px/1.4 ui-sans-serif, system-ui, sans-serif;',
    '  pointer-events: auto;',
    '  user-select: text;',
    '  cursor: auto;',
    '}',
    '.pad { padding: 10px 12px 12px; }',
    '.topline, .actions, .alt { display: flex; align-items: center; gap: 8px; }',
    '.topline { margin-bottom: 8px; }',
    '.grow { flex: 1; min-width: 0; }',
    '.method {',
    '  font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
    '  border: 1px solid currentColor;',
    '  padding: 1px 4px;',
    '  flex: none;',
    '}',
    '.method.get, .ok { color: #7dcea0; }',
    '.method.post, .method.put, .method.patch { color: #f0c36a; }',
    '.method.delete, .bad { color: #ff8f73; }',
    '.method.ws, .method.sse { color: #8ec8ff; }',
    '.quiet { color: #8aa3ab; }',
    '.host { color: #9eb4bb; }',
    '.url, .path, .value, .caller {',
    '  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
    '  word-break: break-word;',
    '}',
    '.url { font-size: 12.5px; color: #e7eef0; margin: 0 0 8px; }',
    '.op { margin: 0 0 2px; font-weight: 600; }',
    '.path { color: #f4d19a; font-size: 12.5px; margin: 2px 0 4px; }',
    '.how { margin: 0 0 6px; }',
    '.value {',
    '  margin: 0;',
    '  padding: 8px 10px;',
    '  background: #0b171d;',
    '  color: #d7ebe3;',
    '  font-size: 12px;',
    '  white-space: pre-wrap;',
    '}',
    '.caller, .meta { margin: 8px 0 0; font-size: 12px; }',
    '.actions { margin-top: 10px; flex-wrap: wrap; }',
    '.actions button { flex: 1 1 30%; }',
    'button {',
    '  font: inherit;',
    '  color: #d5e4e8;',
    '  background: transparent;',
    '  border: 1px solid #2a4652;',
    '  border-radius: 2px;',
    '  padding: 6px 8px;',
    '  cursor: pointer;',
    '}',
    'button:hover { background: #17303a; }',
    'button:focus-visible { outline: 2px solid #ff5a36; outline-offset: 2px; }',
    '.close {',
    '  border: 0;',
    '  padding: 0 2px;',
    '  font-size: 18px;',
    '  line-height: 1;',
    '  color: #e7eef0;',
    '}',
    '.alts { border-top: 1px solid #2a4652; margin-top: 12px; padding-top: 8px; }',
    '.alt {',
    '  width: 100%;',
    '  text-align: left;',
    '  border: 0;',
    '  border-radius: 0;',
    '  padding: 6px 0;',
    '  display: block;',
    '}',
    '.alt .where {',
    '  display: block;',
    '  color: #f4d19a;',
    '  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;',
    '  font-size: 12px;',
    '}',
    '.alt .which {',
    '  display: block;',
    '  color: #9eb4bb;',
    '  font-size: 12px;',
    '  word-break: break-word;',
    '}',
    '.empty { margin: 0; color: #d5e4e8; }',
    '.empty + .hint { margin: 8px 0 0; }',
  ].join('\n');

  let inspecting = false;
  let count = 0;
  let seq = 0;
  let port = null;
  let host = null;
  let shadow = null;
  let box = null;
  let tag = null;
  let chip = null;
  let panel = null;
  let locked = false;
  let lockedEl = null;
  let pendingId = null;
  let currentMatches = [];
  let clearWait = null;

  function report() {
    if (window !== window.top || !port) return;
    try {
      port.postMessage({ type: 'state', on: inspecting, count: count });
    } catch (err) {
      // The service worker may be restarting.
    }
  }

  function connect() {
    let next;
    try {
      next = chrome.runtime.connect({ name: 'endpoint-picker' });
    } catch (err) {
      return;
    }
    port = next;
    port.onMessage.addListener(function (msg) {
      if (!msg) return;
      if (msg.type === 'set-inspect') setInspecting(!!msg.on);
      if (msg.type === 'clear') clearBuffer();
    });
    port.onDisconnect.addListener(function () {
      port = null;
      if (!chrome.runtime.id) return;
      setTimeout(connect, 250);
    });
    report();
  }

  function ensureStyle() {
    if (document.getElementById('endpoint-picker-style')) return;
    const style = document.createElement('style');
    style.id = 'endpoint-picker-style';
    style.textContent = LIGHT_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureUi() {
    if (host) return;
    ensureStyle();
    host = document.createElement('div');
    host.id = 'endpoint-picker-root';
    (document.documentElement || document.body).appendChild(host);
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    box = document.createElement('div');
    box.className = 'box';
    box.hidden = true;
    tag = document.createElement('div');
    tag.className = 'tag';
    tag.hidden = true;
    chip = document.createElement('div');
    chip.className = 'chip';
    chip.hidden = true;
    chip.textContent = 'Click any text. Esc leaves this mode.';
    panel = document.createElement('div');
    panel.className = 'panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Endpoint match');
    shadow.append(style, box, tag, chip, panel);
  }

  function hideHighlight() {
    if (box) box.hidden = true;
    if (tag) tag.hidden = true;
  }

  function hidePanel() {
    if (panel) {
      panel.hidden = true;
      panel.replaceChildren();
    }
    currentMatches = [];
    pendingId = null;
  }

  function describe(el) {
    let node = el;
    for (let depth = 0; node && depth < 5; depth++) {
      if (node.nodeType !== 1 || node === document.body || node === document.documentElement) break;
      const name = node.tagName.toLowerCase();
      if (node.id) return name + '#' + String(node.id).slice(0, 40);
      const classes = node.classList ? Array.from(node.classList) : [];
      const useful = classes.find(function (item) {
        return item && item.length < 40 && item.indexOf('ng-') !== 0;
      });
      if (useful) return name + '.' + useful;
      if (name !== 'span' && name !== 'div' && name !== 'font') return name;
      node = node.parentElement;
    }
    return el && el.tagName ? el.tagName.toLowerCase() : '';
  }

  function placeBox(el) {
    if (!el || !box || !el.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      hideHighlight();
      return;
    }
    box.hidden = false;
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    tag.hidden = false;
    tag.textContent = describe(el);
    tag.style.left = Math.max(4, rect.left) + 'px';
    tag.style.top = (rect.top > 22 ? rect.top - 18 : rect.bottom + 2) + 'px';
  }

  function placePanel(rect) {
    if (!panel) return;
    const margin = 8;
    const width = panel.offsetWidth || 360;
    const height = panel.offsetHeight || 180;
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) left = rect.left - width - margin;
    if (left < margin) left = Math.max(margin, window.innerWidth - width - margin);
    let top = rect.top;
    if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin;
    if (top < margin) top = margin;
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function reposition() {
    if (!inspecting) return;
    const target = locked ? lockedEl : null;
    if (target && target.isConnected) {
      placeBox(target);
      if (panel && !panel.hidden) placePanel(target.getBoundingClientRect());
    }
  }

  function setInspecting(on) {
    inspecting = !!on;
    if (!inspecting) {
      locked = false;
      lockedEl = null;
      hideHighlight();
      hidePanel();
      if (chip) chip.hidden = true;
      document.documentElement.classList.remove('endpoint-picker-on');
    } else {
      ensureUi();
      chip.hidden = window !== window.top;
      document.documentElement.classList.add('endpoint-picker-on');
    }
    report();
  }

  function panelHit(x, y) {
    if (!panel || panel.hidden) return false;
    const rect = panel.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  // Clicks inside the panel have to reach its buttons. Keyboard activation
  // reports client coordinates at 0,0, so the geometry check is not enough.
  function hitsUi(event) {
    const target = event.target;
    if (target && (target === host || target === shadow)) return true;
    if (target && shadow && typeof target.getRootNode === 'function' && target.getRootNode() === shadow) return true;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (let i = 0; i < path.length; i++) {
      if (path[i] === host || path[i] === shadow) return true;
    }
    return panelHit(event.clientX, event.clientY);
  }

  function pickElement(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      if (node === host) return null;
      if (node && node.nodeType === 1 && node !== document.documentElement) return node;
    }
    const target = event.target;
    if (target === host) return null;
    if (target && target.nodeType === 1) return target;
    if (target && target.parentElement) return target.parentElement;
    return null;
  }

  function caretAt(x, y) {
    try {
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) return { node: pos.offsetNode, offset: pos.offset };
      }
    } catch (err) {
      // ignore
    }
    try {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        if (range) return { node: range.startContainer, offset: range.startOffset };
      }
    } catch (err) {
      // ignore
    }
    return null;
  }

  function addPiece(raw, text, around) {
    if (text == null) return;
    const full = String(text).replace(/\s+/g, ' ').trim();
    if (!full) return;
    if (full.length <= 400) {
      raw.push(full);
      if (full.includes(' ')) {
        const parts = full.split(' ');
        for (let i = 0; i < parts.length; i++) {
          const token = parts[i].replace(/^[^A-Za-z0-9$]+|[^A-Za-z0-9.%]+$/g, '');
          if (token.length >= 5 || (token.length >= 3 && /\d/.test(token))) raw.push(token);
        }
      }
      return;
    }
    const offset = typeof around === 'number' ? around : 80;
    raw.push(String(text).slice(Math.max(0, offset - 70), offset + 110).replace(/\s+/g, ' ').trim());
  }

  function collectNeedles(el, x, y) {
    const raw = [];
    const caret = caretAt(x, y);
    if (caret && caret.node && caret.node.nodeType === 3) {
      const text = caret.node.textContent || '';
      if (text.trim().length <= 400) addPiece(raw, text);
      else addPiece(raw, text, caret.offset);
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const secret = el instanceof HTMLInputElement && String(el.type).toLowerCase() === 'password';
      if (!secret) {
        addPiece(raw, el.value);
        addPiece(raw, el.placeholder);
      }
    } else if (el instanceof HTMLSelectElement && el.selectedOptions && el.selectedOptions[0]) {
      addPiece(raw, el.selectedOptions[0].text);
      addPiece(raw, el.value);
    } else if (el instanceof HTMLImageElement) {
      addPiece(raw, el.alt);
      addPiece(raw, el.currentSrc || el.src);
    }
    if (el && el.getAttribute) {
      addPiece(raw, el.getAttribute('aria-label'));
      addPiece(raw, el.getAttribute('title'));
    }
    let visible = '';
    try {
      visible = el && (el.innerText || el.textContent) || '';
    } catch (err) {
      visible = '';
    }
    addPiece(raw, visible, 80);
    return raw;
  }

  function h(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function splitUrl(url) {
    try {
      const parsed = new URL(url);
      return { host: parsed.host, rest: parsed.pathname + parsed.search + parsed.hash };
    } catch (err) {
      return { host: String(url || ''), rest: '' };
    }
  }

  function formatMs(ms) {
    if (ms == null || !Number.isFinite(ms)) return '';
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(1) + ' s';
  }

  function ago(at) {
    if (!at) return '';
    const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return seconds + 's ago';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    return Math.round(minutes / 60) + 'h ago';
  }

  function shortenCaller(caller) {
    const raw = String(caller);
    const lineMatch = raw.match(/:(\d+):\d+\s*$/);
    const line = lineMatch ? lineMatch[1] : '';
    const base = (lineMatch ? raw.slice(0, raw.length - lineMatch[0].length) : raw).split('?')[0];
    let file = 'page';
    try {
      const url = new URL(base);
      file = url.pathname.split('/').filter(Boolean).pop() || 'page';
    } catch (err) {
      const parts = base.split('/').filter(Boolean);
      file = parts.length ? parts[parts.length - 1] : 'page';
    }
    return line ? file + ':' + line : file;
  }

  function statusClass(status) {
    const code = Number(status);
    if (code >= 200 && code < 300) return 'ok';
    if (code >= 400) return 'bad';
    return 'quiet';
  }

  function howText(match) {
    if (match.matchType === 'exact') return 'Exact value';
    if (match.matchType === 'contains') return 'This field contains the text';
    return 'Found in the raw response';
  }

  function curlFor(match) {
    const url = String(match.url || '').replace(/'/g, "'\\''");
    const method = String(match.method || 'GET').toUpperCase();
    if (method === 'GET') return "curl '" + url + "'";
    return "curl -X " + method + " '" + url + "'";
  }

  async function copyText(text, button) {
    const previous = button.textContent;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else throw new Error('clipboard unavailable');
      button.textContent = 'Copied';
    } catch (err) {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        panel.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        button.textContent = 'Copied';
      } catch (copyErr) {
        button.textContent = 'Could not copy';
      }
    }
    setTimeout(function () {
      if (button.isConnected) button.textContent = previous;
    }, 1200);
  }

  function renderEmpty(message, hint) {
    panel.replaceChildren();
    panel.hidden = false;
    const pad = h('div', 'pad');
    const top = h('div', 'topline');
    top.append(h('div', 'grow quiet', 'No endpoint'));
    const close = h('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      locked = false;
      lockedEl = null;
      hidePanel();
      hideHighlight();
    });
    top.append(close);
    pad.append(top);
    const title = h('p', 'empty');
    title.dataset.ep = 'empty';
    title.textContent = message;
    pad.append(title);
    pad.append(h('p', 'hint quiet', hint));
    panel.append(pad);
    if (lockedEl) placePanel(lockedEl.getBoundingClientRect());
  }

  function renderMatches(matches) {
    currentMatches = matches.slice();
    const primary = currentMatches[0];
    panel.replaceChildren();
    panel.hidden = false;
    const pad = h('div', 'pad');
    const top = h('div', 'topline');
    const method = h('span', 'method ' + String(primary.method || '').toLowerCase(), primary.method || '');
    top.append(method);
    if (primary.status != null && primary.method !== 'WS' && primary.method !== 'SSE') {
      top.append(h('span', statusClass(primary.status), String(primary.status)));
    }
    const timing = [ago(primary.at), formatMs(primary.ms)].filter(Boolean).join(' · ');
    if (timing) top.append(h('span', 'quiet', timing));
    const grow = h('div', 'grow');
    top.append(grow);
    const close = h('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      locked = false;
      lockedEl = null;
      hidePanel();
      hideHighlight();
    });
    top.append(close);
    pad.append(top);

    const url = splitUrl(primary.url);
    if (primary.operationName) pad.append(h('p', 'op', primary.operationName));
    const urlLine = h('p', 'url');
    urlLine.dataset.ep = 'primary-url';
    urlLine.append(h('span', 'host', url.host));
    urlLine.append(document.createTextNode(url.rest));
    pad.append(urlLine);

    if (primary.path) {
      const path = h('p', 'path', primary.path);
      path.dataset.ep = 'primary-path';
      pad.append(path);
    }
    const how = h('p', 'how quiet', howText(primary));
    how.dataset.ep = 'primary-how';
    pad.append(how);
    const value = h('pre', 'value', primary.value || '');
    value.dataset.ep = 'primary-value';
    pad.append(value);

    if (primary.caller) {
      const caller = h('p', 'caller quiet', 'Called from ' + shortenCaller(primary.caller));
      caller.title = primary.caller;
      pad.append(caller);
    }
    if (primary.requestId) pad.append(h('p', 'meta quiet', 'Request id ' + primary.requestId));
    if (primary.truncated) {
      pad.append(h('p', 'meta quiet', 'Only the first part of this response was kept. The match is inside that part.'));
    }

    const actions = h('div', 'actions');
    const copyUrl = h('button', '', 'Copy endpoint');
    copyUrl.type = 'button';
    copyUrl.addEventListener('click', function () {
      copyText(primary.url, copyUrl);
    });
    actions.append(copyUrl);
    if (primary.path) {
      const copyPath = h('button', '', 'Copy path');
      copyPath.type = 'button';
      copyPath.addEventListener('click', function () {
        copyText(primary.path, copyPath);
      });
      actions.append(copyPath);
    }
    if (primary.url && primary.method !== 'WS' && primary.method !== 'SSE') {
      const copyCurl = h('button', '', 'Copy curl');
      copyCurl.type = 'button';
      copyCurl.addEventListener('click', function () {
        copyText(curlFor(primary), copyCurl);
      });
      actions.append(copyCurl);
    }
    pad.append(actions);

    if (currentMatches.length > 1) {
      const alts = h('div', 'alts');
      alts.append(h('div', 'quiet', 'Also matched'));
      for (let i = 1; i < currentMatches.length; i++) {
        const alt = currentMatches[i];
        const button = h('button', 'alt');
        button.type = 'button';
        const bits = splitUrl(alt.url);
        const where = alt.path || howText(alt);
        button.append(h('span', 'where', where));
        button.append(h('span', 'which', (alt.method || '') + ' ' + bits.host + bits.rest));
        button.addEventListener('click', function () {
          const next = currentMatches.slice();
          const chosen = next.splice(i, 1)[0];
          next.unshift(chosen);
          renderMatches(next);
        });
        alts.append(button);
      }
      pad.append(alts);
    }
    panel.append(pad);
    if (lockedEl) placePanel(lockedEl.getBoundingClientRect());
  }

  function showResult(data) {
    if (!inspecting || !panel) return;
    if (data.error === 'matcher-missing') {
      renderEmpty(
        'The page bridge did not load.',
        'Reload the tab. Pages that were already open when you installed the extension have not been patched yet.'
      );
      return;
    }
    const matches = Array.isArray(data.matches) ? data.matches : [];
    if (!matches.length) {
      const buffered = typeof data.count === 'number' ? data.count : count;
      if (!buffered) {
        renderEmpty(
          'No responses captured yet.',
          'Reload the page, use it, then click the text again. Only fetch and XHR calls from the page are visible. Worker requests are not.'
        );
      } else {
        renderEmpty(
          'No captured response contains this text.',
          buffered + ' responses are buffered. A date, price, or sentence built by the page will not match a field that stores a different form of the same fact.'
        );
      }
      return;
    }
    renderMatches(matches);
  }

  function runQuery(needles) {
    const id = 'q' + (++seq);
    pendingId = id;
    panel.hidden = false;
    panel.replaceChildren();
    const pad = h('div', 'pad');
    pad.append(h('p', 'empty', 'Searching captured responses…'));
    panel.append(pad);
    if (lockedEl) placePanel(lockedEl.getBoundingClientRect());
    window.postMessage({
      source: SOURCE,
      dir: 'to-page',
      type: 'query',
      id: id,
      needles: needles,
    }, '*');
    setTimeout(function () {
      if (pendingId !== id || !inspecting) return;
      pendingId = null;
      renderEmpty(
        'The page bridge did not answer.',
        'Reload the tab so the extension can patch fetch before the page asks for data.'
      );
    }, 900);
  }

  function inspectAt(event) {
    const el = pickElement(event);
    if (!el || el === document.body || el === document.documentElement) return;
    locked = true;
    lockedEl = el;
    placeBox(el);
    const needles = collectNeedles(el, event.clientX, event.clientY);
    if (!needles.length) {
      showResult({ matches: [], count: count });
      return;
    }
    runQuery(needles);
  }

  function onPointerDown(event) {
    if (!inspecting || event.button !== 0) return;
    if (hitsUi(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    inspectAt(event);
  }

  function swallowClick(event) {
    if (!inspecting) return;
    if (hitsUi(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onMove(event) {
    if (!inspecting || locked) return;
    const el = pickElement(event);
    if (!el || el === document.body || el === document.documentElement) {
      hideHighlight();
      return;
    }
    placeBox(el);
  }

  function onKey(event) {
    if (!inspecting || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setInspecting(false);
  }

  function clearBuffer() {
    if (clearWait) return clearWait;
    clearWait = new Promise(function (resolve) {
      const id = 'c' + (++seq);
      const timer = setTimeout(function () {
        window.removeEventListener('message', onMsg);
        clearWait = null;
        resolve(count);
      }, 800);
      function onMsg(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== SOURCE || data.dir !== 'to-content') return;
        if (data.type !== 'cleared' || data.id !== id) return;
        count = data.count;
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        clearWait = null;
        report();
        resolve(count);
      }
      window.addEventListener('message', onMsg);
      window.postMessage({ source: SOURCE, dir: 'to-page', type: 'clear', id: id }, '*');
    });
    return clearWait;
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE || data.dir !== 'to-content') return;
    if (data.type === 'count' && typeof data.count === 'number') {
      count = data.count;
      return;
    }
    if (data.type === 'result' && data.id === pendingId) {
      pendingId = null;
      if (typeof data.count === 'number') count = data.count;
      showResult(data);
    }
  });

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('click', swallowClick, true);
  window.addEventListener('auxclick', swallowClick, true);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition, true);

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'get-status') {
      if (window !== window.top) return;
      sendResponse({ ok: true, inspecting: inspecting, count: count });
      return;
    }
    if (msg.type === 'set-inspect') {
      setInspecting(!!msg.on);
      if (window === window.top) sendResponse({ ok: true, inspecting: inspecting, count: count });
      return;
    }
    if (msg.type === 'clear') {
      clearBuffer().then(function (next) {
        if (window === window.top) sendResponse({ ok: true, inspecting: inspecting, count: next });
      });
      return true;
    }
  });

  connect();
  let helloTries = 0;
  function hello() {
    window.postMessage({ source: SOURCE, dir: 'to-page', type: 'hello' }, '*');
    helloTries += 1;
    if (helloTries < 8) {
      setTimeout(function () {
        if (count === 0) hello();
      }, 250);
    }
  }
  hello();
})();
