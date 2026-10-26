'use strict';

// Pure matcher shared by the page bridge and the node tests.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.__EI_MATCH = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TYPE_SCORE = { exact: 1000, contains: 620, body: 400 };

  function norm(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function clip(value, max) {
    const text = String(value).replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function expandNeedles(list) {
    const out = [];
    const seen = new Set();
    function add(raw) {
      const text = norm(raw == null ? '' : raw);
      if (!text || text.length > 180) return;
      if (!/[A-Za-z0-9]/.test(text)) return;
      if (seen.has(text)) return;
      seen.add(text);
      out.push(text);
    }
    const source = Array.isArray(list) ? list : [];
    for (let i = 0; i < source.length; i++) {
      const item = source[i];
      add(item);
      const stripped = String(item == null ? '' : item).replace(/[$,\s]/g, '');
      if (/^-?\d+(\.\d+)?$/.test(stripped)) add(stripped);
    }
    return out.slice(0, 24);
  }

  function tryParse(text) {
    if (typeof text !== 'string') return { ok: false };
    let source = text.replace(/^\uFEFF/, '').trim();
    if (!source) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(source) };
    } catch (err) {
      // ignore
    }
    // Google-style XSSI prefix: )]}'\n{...}
    if (source.charCodeAt(0) === 41) {
      const breakAt = source.indexOf('\n');
      if (breakAt > 0 && breakAt < 32) {
        try {
          return { ok: true, value: JSON.parse(source.slice(breakAt + 1)) };
        } catch (err) {
          // ignore
        }
      }
    }
    return { ok: false };
  }

  function joinPath(base, key) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return base ? base + '.' + key : key;
    const escaped = String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return (base || '') + "['" + escaped + "']";
  }

  function looseIndex(body, needle) {
    const direct = body.indexOf(needle);
    if (direct >= 0) return direct;
    if (!needle.includes(' ')) return -1;
    const pattern = needle.split(' ').map(escapeRegExp).join('\\s+');
    const match = new RegExp(pattern).exec(body);
    return match ? match.index : -1;
  }

  function snippet(body, needle) {
    const at = looseIndex(body, needle);
    if (at < 0) return clip(body, 160);
    const start = Math.max(0, at - 48);
    const end = Math.min(body.length, at + needle.length + 48);
    let text = body.slice(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) text = '…' + text;
    if (end < body.length) text += '…';
    return clip(text, 180);
  }

  function sameOrigin(url, origin) {
    if (!origin) return false;
    try {
      return new URL(url).origin === origin;
    } catch (err) {
      return false;
    }
  }

  function consider(raw, path, needle, bag) {
    const text = String(raw);
    const folded = norm(text);
    const wanted = norm(needle);
    if (!wanted) return;
    let matchType = null;
    if (folded === wanted) matchType = 'exact';
    else if (wanted.length >= 4 && folded.includes(wanted)) {
      if (folded.length <= 2000 || wanted.length >= 12) matchType = 'contains';
    }
    if (!matchType) return;
    bag.push({
      path: path || '(response)',
      matchType: matchType,
      value: clip(text, 160),
      needle: wanted,
    });
  }

  function walk(node, path, needle, bag, budget, depth) {
    if (budget.nodes++ > budget.maxNodes) return;
    if (bag.length >= budget.maxHits) return;
    if (node == null) return;
    const kind = typeof node;
    if (kind === 'string') {
      consider(node, path, needle, bag);
      if (
        depth < 8 &&
        node.length >= 2 &&
        node.length <= 200000 &&
        (node.charCodeAt(0) === 123 || node.charCodeAt(0) === 91) &&
        node.includes(needle)
      ) {
        const inner = tryParse(node);
        if (inner.ok && inner.value && typeof inner.value === 'object') {
          walk(inner.value, path, needle, bag, budget, depth + 1);
        }
      }
      return;
    }
    if (kind === 'number' || kind === 'boolean') {
      consider(node, path, needle, bag);
      return;
    }
    if (depth >= budget.maxDepth) return;
    if (Array.isArray(node)) {
      const count = node.length;
      for (let i = 0; i < count; i++) {
        if (bag.length >= budget.maxHits || budget.nodes > budget.maxNodes) return;
        walk(node[i], (path || '') + '[' + i + ']', needle, bag, budget, depth + 1);
      }
      return;
    }
    if (kind === 'object') {
      const keys = Object.keys(node);
      for (let i = 0; i < keys.length; i++) {
        if (bag.length >= budget.maxHits || budget.nodes > budget.maxNodes) return;
        walk(node[keys[i]], joinPath(path, keys[i]), needle, bag, budget, depth + 1);
      }
    }
  }

  function bodyHit(body, needle) {
    const wanted = norm(needle);
    if (!wanted || wanted.length < 2) return null;
    const folded = norm(body);
    if (folded === wanted) {
      return { matchType: 'exact', value: clip(body, 160), needle: wanted, path: null };
    }
    if (wanted.length >= 4 && folded.includes(wanted)) {
      return { matchType: 'body', value: snippet(body, wanted), needle: wanted, path: null };
    }
    return null;
  }

  function findInResponses(responses, rawNeedles, origin) {
    const needles = expandNeedles(rawNeedles);
    if (!needles.length || !Array.isArray(responses)) return [];
    const found = [];
    for (let r = 0; r < responses.length; r++) {
      const entry = responses[r];
      if (!entry || typeof entry.body !== 'string' || !entry.body) continue;
      const body = entry.body;
      const foldedBody = norm(body);
      for (let n = 0; n < needles.length; n++) {
        const needle = needles[n];
        if (needle.length >= 4 && !foldedBody.includes(needle) && !body.includes(needle)) continue;
        if (needle.length < 4 && !foldedBody.includes(needle)) continue;
        const bag = [];
        const parsed = tryParse(body);
        if (parsed.ok) {
          walk(parsed.value, '', needle, bag, { nodes: 0, maxNodes: 80000, maxHits: 30, maxDepth: 14 }, 0);
        }
        if (!bag.length && !parsed.ok) {
          const raw = bodyHit(body, needle);
          if (raw) bag.push(raw);
        }
        for (let i = 0; i < bag.length; i++) {
          const hit = bag[i];
          let score = TYPE_SCORE[hit.matchType] + Math.min(needle.length, 120);
          if (hit.path) score -= Math.min(hit.path.length, 100) * 0.15;
          if (sameOrigin(entry.url, origin)) score += 20;
          score += Math.min(entry.id || 0, 100000) / 100000;
          found.push({
            id: entry.id,
            url: entry.url,
            method: entry.method,
            status: entry.status,
            ms: entry.ms,
            at: entry.at,
            operationName: entry.operationName || null,
            requestId: entry.requestId || null,
            caller: entry.caller || null,
            truncated: !!entry.truncated,
            path: hit.path,
            matchType: hit.matchType,
            value: hit.value,
            needle: hit.needle,
            score: score,
          });
        }
      }
    }
    found.sort(function (a, b) {
      return b.score - a.score || (b.at || 0) - (a.at || 0);
    });
    const seen = new Set();
    const out = [];
    for (let i = 0; i < found.length && out.length < 8; i++) {
      const hit = found[i];
      // One row per field. A shorter needle from the same click should not
      // repeat the exact field that already won.
      const key = [hit.method, hit.url, hit.path || 'body:' + hit.needle].join('\n');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
    return out;
  }

  return { findInResponses: findInResponses, expandNeedles: expandNeedles, tryParse: tryParse };
});
