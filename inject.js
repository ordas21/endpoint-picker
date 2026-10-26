'use strict';

// Runs in the page's main world so it can see fetch and XHR before the app does.
(function () {
  if (window.__endpointPickerInstalled) return;
  window.__endpointPickerInstalled = true;

  const SOURCE = 'endpoint-picker';
  const MAX_ENTRIES = 80;
  const MAX_STREAM = 30;
  const MAX_CHARS = 250000;
  const buffer = [];
  let seq = 0;
  const matcher = globalThis.__EI_MATCH;

  const STATIC_URL = /\.(?:png|jpe?g|gif|webp|avif|ico|css|map|woff2?|ttf|otf|eot|mp4|webm|mp3|wasm|pdf|zip|gz)(?:$|[?#])/i;

  function post(message) {
    message.source = SOURCE;
    message.dir = 'to-content';
    window.postMessage(message, '*');
  }

  function announce() {
    post({ type: 'count', count: buffer.length });
  }

  function shouldCapture(url, contentType) {
    if (!url || url.indexOf('data:') === 0 || url.indexOf('chrome-extension:') === 0) return false;
    if (STATIC_URL.test(url)) return false;
    const type = String(contentType || '').toLowerCase();
    if (/^(image|font|audio|video)\//.test(type)) return false;
    if (type.indexOf('text/css') !== -1) return false;
    if (type.indexOf('javascript') !== -1 && type.indexOf('json') === -1) return false;
    return true;
  }

  function absoluteUrl(url) {
    try {
      return new URL(url, location.href).href;
    } catch (err) {
      return String(url || '');
    }
  }

  function callerFromStack(stack) {
    if (!stack) return null;
    const lines = String(stack).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.indexOf('inject.js') !== -1 || line.indexOf('match.js') !== -1) continue;
      const match = line.match(/((?:https?|file):\/\/[^\s)]+)/);
      if (!match) continue;
      if (match[1].indexOf('chrome-extension://') === 0) continue;
      return match[1].slice(0, 300);
    }
    return null;
  }

  function graphqlOperation(url, bodyText) {
    try {
      const parsed = new URL(url, location.href);
      const fromQuery = parsed.searchParams.get('operationName');
      if (fromQuery) return fromQuery.slice(0, 120);
    } catch (err) {
      // ignore
    }
    if (!bodyText || typeof bodyText !== 'string') return null;
    const slice = bodyText.slice(0, 20000);
    try {
      const json = JSON.parse(slice);
      const op = json && (json.operationName || (json[0] && json[0].operationName));
      if (typeof op === 'string' && op) return op.slice(0, 120);
    } catch (err) {
      // ignore
    }
    const match = slice.match(/"operationName"\s*:\s*"([^"]{1,120})"/);
    return match ? match[1] : null;
  }

  function requestBodyText(input, init) {
    try {
      const body = init && Object.prototype.hasOwnProperty.call(init, 'body') ? init.body : null;
      if (typeof body === 'string') return body.slice(0, 20000);
      if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body.toString().slice(0, 20000);
    } catch (err) {
      // ignore
    }
    return null;
  }

  function safeMeta(input, init) {
    let method = 'GET';
    let url = '';
    try {
      if (typeof input === 'string' || (typeof URL !== 'undefined' && input instanceof URL)) {
        url = String(input);
      } else if (input && typeof input.url === 'string') {
        url = input.url;
        if (input.method) method = input.method;
      }
    } catch (err) {
      // ignore
    }
    try {
      if (init && init.method) method = init.method;
    } catch (err) {
      // ignore
    }
    method = String(method || 'GET').toUpperCase();
    url = absoluteUrl(url);
    const bodyText = requestBodyText(input, init);
    return {
      method: method,
      url: url,
      operationName: graphqlOperation(url, bodyText),
    };
  }

  function header(headers, name) {
    try {
      if (!headers || !headers.get) return null;
      const value = headers.get(name);
      return value ? String(value).slice(0, 200) : null;
    } catch (err) {
      return null;
    }
  }

  function push(entry) {
    buffer.push(entry);
    if (entry.method === 'WS' || entry.method === 'SSE') {
      let streams = 0;
      for (let i = 0; i < buffer.length; i++) {
        const method = buffer[i].method;
        if (method === 'WS' || method === 'SSE') streams++;
      }
      if (streams > MAX_STREAM) {
        const oldest = buffer.findIndex(function (item) {
          return item.method === 'WS' || item.method === 'SSE';
        });
        if (oldest >= 0) buffer.splice(oldest, 1);
      }
    }
    while (buffer.length > MAX_ENTRIES) buffer.shift();
    announce();
  }

  function record(meta, extras) {
    const text = extras.text || '';
    if (!text) return;
    if (text.indexOf('\0') !== -1) return;
    seq += 1;
    push({
      id: seq,
      url: extras.url || meta.url,
      method: meta.method,
      status: extras.status,
      ms: extras.ms,
      contentType: extras.contentType || '',
      body: text.slice(0, MAX_CHARS),
      truncated: !!extras.truncated || text.length > MAX_CHARS,
      operationName: meta.operationName || null,
      requestId: extras.requestId || null,
      caller: meta.caller || null,
      at: extras.at || Date.now(),
    });
  }

  function readTextLimited(response) {
    let declared = NaN;
    try {
      declared = Number(response.headers && response.headers.get && response.headers.get('content-length'));
    } catch (err) {
      declared = NaN;
    }
    // Skip multi-megabyte bodies. Cancelling a cloned stream early has been
    // known to disturb the page's own read, so leave those responses alone.
    if (Number.isFinite(declared) && declared > MAX_CHARS * 8) {
      return Promise.resolve({ text: '', skipped: true });
    }
    if (!response.body || typeof response.body.getReader !== 'function') {
      return response.text().then(function (text) {
        return { text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
      });
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = '';
    let bytes = 0;
    const maxBytes = MAX_CHARS * 3;
    function pump() {
      return reader.read().then(function (step) {
        if (step.done) {
          text += decoder.decode();
          return { text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
        }
        bytes += step.value.byteLength;
        text += decoder.decode(step.value, { stream: true });
        if (bytes >= maxBytes || text.length >= MAX_CHARS) {
          text += decoder.decode();
          return reader.cancel().catch(function () {}).then(function () {
            return { text: text.slice(0, MAX_CHARS), truncated: true };
          });
        }
        return pump();
      });
    }
    return pump();
  }

  function captureFetch(res, meta, startedAt, startedMs) {
    if (!res || typeof res.clone !== 'function') return;
    let contentType = '';
    let url = meta.url;
    try {
      contentType = header(res.headers, 'content-type') || '';
      url = res.url || meta.url;
    } catch (err) {
      return;
    }
    if (meta.method === 'OPTIONS' || !shouldCapture(url, contentType)) return;
    let copy;
    try {
      copy = res.clone();
    } catch (err) {
      return;
    }
    readTextLimited(copy).then(function (read) {
      if (!read || read.skipped || !read.text || !read.text.trim()) return;
      record(meta, {
        url: url,
        status: res.status,
        ms: Math.max(0, Math.round(performance.now() - startedMs)),
        contentType: contentType,
        text: read.text,
        truncated: read.truncated,
        requestId: header(res.headers, 'x-request-id') || header(res.headers, 'x-correlation-id'),
        at: startedAt,
      });
    }, function () {});
  }

  function installFetch() {
    if (typeof window.fetch !== 'function' || window.fetch.__endpointPicker) return;
    const origFetch = window.fetch;
    function wrappedFetch(input, init) {
      let meta = { method: 'GET', url: '', operationName: null, caller: null };
      try {
        meta = safeMeta(input, init);
        meta.caller = callerFromStack(new Error().stack);
      } catch (err) {
        // keep the defaults
      }
      const startedMs = performance.now();
      const startedAt = Date.now();
      const result = origFetch.apply(this, arguments);
      Promise.resolve(result).then(function (res) {
        try {
          captureFetch(res, meta, startedAt, startedMs);
        } catch (err) {
          // never break the caller
        }
      }, function () {});
      return result;
    }
    wrappedFetch.__endpointPicker = true;
    try {
      window.fetch = wrappedFetch;
    } catch (err) {
      // ignore
    }
  }

  function installXhr() {
    const proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
    if (!proto || proto.open.__endpointPicker) return;
    const origOpen = proto.open;
    const origSend = proto.send;
    function wrappedOpen(method, url) {
      try {
        this.__endpointPickerMeta = {
          method: String(method || 'GET').toUpperCase(),
          url: absoluteUrl(url),
          caller: callerFromStack(new Error().stack),
        };
      } catch (err) {
        this.__endpointPickerMeta = { method: 'GET', url: '', caller: null };
      }
      return origOpen.apply(this, arguments);
    }
    wrappedOpen.__endpointPicker = true;
    function wrappedSend(body) {
      const meta = this.__endpointPickerMeta || { method: 'GET', url: '', caller: null };
      try {
        const bodyText = typeof body === 'string' ? body.slice(0, 20000) : null;
        meta.operationName = graphqlOperation(meta.url, bodyText);
      } catch (err) {
        meta.operationName = null;
      }
      const startedMs = performance.now();
      const startedAt = Date.now();
      try {
        this.addEventListener('load', function () {
          try {
            const contentType = this.getResponseHeader && this.getResponseHeader('content-type');
            const url = absoluteUrl(this.responseURL || meta.url);
            if (meta.method === 'OPTIONS' || !shouldCapture(url, contentType || '')) return;
            let text = '';
            const responseType = this.responseType;
            if (responseType === '' || responseType === 'text') text = this.responseText || '';
            else if (responseType === 'json' && this.response != null) text = JSON.stringify(this.response);
            else return;
            if (!text || !String(text).trim() || String(text).indexOf('\0') !== -1) return;
            let requestId = null;
            try {
              requestId = this.getResponseHeader('x-request-id') || this.getResponseHeader('x-correlation-id');
            } catch (err) {
              requestId = null;
            }
            record(
              {
                method: meta.method,
                url: url,
                operationName: meta.operationName || null,
                caller: meta.caller || null,
              },
              {
                url: url,
                status: this.status,
                ms: Math.max(0, Math.round(performance.now() - startedMs)),
                contentType: contentType || '',
                text: String(text),
                truncated: String(text).length > MAX_CHARS,
                requestId: requestId,
                at: startedAt,
              }
            );
          } catch (err) {
            // ignore
          }
        }, { once: true });
      } catch (err) {
        // ignore
      }
      return origSend.apply(this, arguments);
    }
    proto.open = wrappedOpen;
    proto.send = wrappedSend;
  }

  function installEventSource() {
    const Orig = window.EventSource;
    if (typeof Orig !== 'function' || Orig.__endpointPicker) return;
    function Wrapped(url, config) {
      const stream = config === undefined ? new Orig(url) : new Orig(url, config);
      const meta = {
        method: 'SSE',
        url: absoluteUrl(url),
        operationName: null,
        caller: null,
      };
      try {
        meta.caller = callerFromStack(new Error().stack);
      } catch (err) {
        // ignore
      }
      stream.addEventListener('message', function (event) {
        try {
          if (typeof event.data !== 'string' || !event.data) return;
          record(meta, {
            url: meta.url,
            status: 200,
            ms: null,
            contentType: 'text/event-stream',
            text: event.data,
            truncated: event.data.length > MAX_CHARS,
            at: Date.now(),
          });
        } catch (err) {
          // ignore
        }
      });
      return stream;
    }
    Wrapped.prototype = Orig.prototype;
    Wrapped.CONNECTING = Orig.CONNECTING;
    Wrapped.OPEN = Orig.OPEN;
    Wrapped.CLOSED = Orig.CLOSED;
    Wrapped.__endpointPicker = true;
    try {
      window.EventSource = Wrapped;
    } catch (err) {
      // ignore
    }
  }

  function installWebSocket() {
    const Orig = window.WebSocket;
    if (typeof Orig !== 'function' || Orig.__endpointPicker) return;
    function Wrapped(url, protocols) {
      const socket = protocols === undefined ? new Orig(url) : new Orig(url, protocols);
      const meta = {
        method: 'WS',
        url: absoluteUrl(typeof url === 'string' ? url : String(url)),
        operationName: null,
        caller: null,
      };
      try {
        meta.caller = callerFromStack(new Error().stack);
      } catch (err) {
        // ignore
      }
      socket.addEventListener('message', function (event) {
        try {
          if (typeof event.data !== 'string' || !event.data) return;
          record(meta, {
            url: meta.url,
            status: 101,
            ms: null,
            contentType: 'websocket',
            text: event.data,
            truncated: event.data.length > MAX_CHARS,
            at: Date.now(),
          });
        } catch (err) {
          // ignore
        }
      });
      return socket;
    }
    Wrapped.prototype = Orig.prototype;
    Wrapped.CONNECTING = Orig.CONNECTING;
    Wrapped.OPEN = Orig.OPEN;
    Wrapped.CLOSING = Orig.CLOSING;
    Wrapped.CLOSED = Orig.CLOSED;
    Wrapped.__endpointPicker = true;
    try {
      window.WebSocket = Wrapped;
    } catch (err) {
      // ignore
    }
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE || data.dir !== 'to-page') return;
    if (data.type === 'hello' || data.type === 'count') {
      announce();
      return;
    }
    if (data.type === 'clear') {
      buffer.splice(0, buffer.length);
      post({ type: 'cleared', id: data.id, count: 0 });
      return;
    }
    if (data.type === 'query') {
      let matches = [];
      let error = null;
      try {
        if (!matcher || typeof matcher.findInResponses !== 'function') error = 'matcher-missing';
        else matches = matcher.findInResponses(buffer, data.needles || [], location.origin);
      } catch (err) {
        error = 'search-failed';
        matches = [];
      }
      post({
        type: 'result',
        id: data.id,
        matches: matches,
        count: buffer.length,
        error: error,
      });
    }
  });

  try {
    installFetch();
    installXhr();
    installEventSource();
    installWebSocket();
  } catch (err) {
    // The page must keep working even if a patch fails.
  }
})();
