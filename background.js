'use strict';

const ports = new Set();

function setBadge(tabId, on) {
  const text = on ? 'ON' : '';
  chrome.action.setBadgeText({ tabId: tabId, text: text });
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#ff5a36' });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId: tabId, color: '#1a0d09' });
  }
}

chrome.runtime.onConnect.addListener(function (port) {
  if (!port || port.name !== 'endpoint-picker') return;
  ports.add(port);
  port.onDisconnect.addListener(function () {
    ports.delete(port);
  });
  port.onMessage.addListener(function (msg) {
    if (!msg || msg.type !== 'state') return;
    const tabId = port.sender && port.sender.tab && port.sender.tab.id;
    if (tabId == null) return;
    setBadge(tabId, !!msg.on);
  });
});

function broadcast(tabId, message) {
  let delivered = 0;
  for (const port of ports) {
    const senderTab = port.sender && port.sender.tab && port.sender.tab.id;
    if (senderTab !== tabId) continue;
    try {
      port.postMessage(message);
      delivered++;
    } catch (err) {
      // The frame may already be gone.
    }
  }
  return delivered;
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function unavailable() {
  return {
    ok: false,
    inspecting: false,
    count: 0,
    reason: 'Reload this tab to start capturing. Chrome pages and the Web Store cannot be inspected.',
  };
}

async function frameStatus(tabId) {
  try {
    const status = await chrome.tabs.sendMessage(tabId, { type: 'get-status' }, { frameId: 0 });
    if (!status || !status.ok) return null;
    return status;
  } catch (err) {
    return null;
  }
}

async function popupStatus() {
  const tab = await activeTab();
  if (!tab || tab.id == null) return unavailable();
  const status = await frameStatus(tab.id);
  return status || unavailable();
}

async function popupToggle() {
  const tab = await activeTab();
  if (!tab || tab.id == null) return unavailable();
  const status = await frameStatus(tab.id);
  if (!status) return unavailable();
  const on = !status.inspecting;
  broadcast(tab.id, { type: 'set-inspect', on: on });
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'set-inspect', on: on }, { frameId: 0 });
  } catch (err) {
    return unavailable();
  }
  setBadge(tab.id, on);
  return { ok: true, inspecting: on, count: status.count };
}

async function popupClear() {
  const tab = await activeTab();
  if (!tab || tab.id == null) return unavailable();
  broadcast(tab.id, { type: 'clear' });
  try {
    const cleared = await chrome.tabs.sendMessage(tab.id, { type: 'clear' }, { frameId: 0 });
    if (!cleared || !cleared.ok) return unavailable();
    return cleared;
  } catch (err) {
    return unavailable();
  }
}

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('popup-') !== 0) return;
  const run = msg.type === 'popup-toggle' ? popupToggle : msg.type === 'popup-clear' ? popupClear : popupStatus;
  run().then(sendResponse, function () {
    sendResponse(unavailable());
  });
  return true;
});

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'toggle-inspect') return;
  popupToggle();
});

chrome.tabs.onUpdated.addListener(function (tabId, info) {
  if (info.status === 'loading') setBadge(tabId, false);
});
