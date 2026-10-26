'use strict';

const statusEl = document.querySelector('#status');
const reasonEl = document.querySelector('#reason');
const countEl = document.querySelector('#count');
const toggleBtn = document.querySelector('#toggle');
const clearBtn = document.querySelector('#clear');
const shortcutEl = document.querySelector('#shortcut');

function render(res) {
  if (!res || !res.ok) {
    reasonEl.hidden = false;
    reasonEl.textContent = (res && res.reason) || 'Reload this tab to start capturing.';
    toggleBtn.disabled = true;
    clearBtn.disabled = true;
    toggleBtn.textContent = 'Start inspecting';
    statusEl.textContent = 'Not capturing';
    countEl.textContent = '0';
    return;
  }
  reasonEl.hidden = true;
  toggleBtn.disabled = false;
  clearBtn.disabled = false;
  toggleBtn.textContent = res.inspecting ? 'Stop inspecting' : 'Start inspecting';
  statusEl.textContent = res.inspecting ? 'Inspecting this tab' : 'Capturing this tab';
  countEl.textContent = String(res.count || 0);
}

async function refresh() {
  const res = await chrome.runtime.sendMessage({ type: 'popup-status' });
  render(res);
}

toggleBtn.addEventListener('click', async function () {
  toggleBtn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'popup-toggle' });
  render(res);
});

clearBtn.addEventListener('click', async function () {
  clearBtn.disabled = true;
  const res = await chrome.runtime.sendMessage({ type: 'popup-clear' });
  render(res);
});

document.querySelector('#privacy').addEventListener('click', function (event) {
  event.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
});

chrome.commands.getAll(function (commands) {
  const command = (commands || []).find(function (item) {
    return item.name === 'toggle-inspect';
  });
  shortcutEl.textContent = command && command.shortcut ? command.shortcut : 'Unset';
});

refresh();
