import { toShareLink } from './share-link.js';

const MENU_ID = 'bm-shopee-copy-share-link';
const KEY_COPY = 'copyShareEnabled';
const KEY_LIST = 'listLayoutEnabled';
const KEY_LEGACY = 'featureEnabled';
let uiStateQueue = Promise.resolve();

const DOCUMENT_URL_PATTERNS = [
  '*://shopee.tw/*',
  '*://*.shopee.tw/*',
  '*://shopee.com/*',
  '*://*.shopee.com/*',
  '*://shopee.sg/*',
  '*://*.shopee.sg/*',
  '*://shopee.co.th/*',
  '*://*.shopee.co.th/*',
  '*://shopee.com.my/*',
  '*://*.shopee.com.my/*',
  '*://shopee.vn/*',
  '*://*.shopee.vn/*',
  '*://shopee.ph/*',
  '*://*.shopee.ph/*',
  '*://shopee.co.id/*',
  '*://*.shopee.co.id/*',
  '*://shopee.com.br/*',
  '*://*.shopee.com.br/*',
  '*://xiapi.xiapibuy.com/*',
  '*://*.xiapibuy.com/*'
];

const ICONS_ON = {
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
};

const ICONS_OFF = {
  16: 'icons/icon16-off.png',
  48: 'icons/icon48-off.png',
  128: 'icons/icon128-off.png'
};

async function migrateSettings() {
  const data = await chrome.storage.local.get([KEY_COPY, KEY_LIST, KEY_LEGACY]);
  const patch = {};
  if (data[KEY_COPY] === undefined) {
    patch[KEY_COPY] = data[KEY_LEGACY] !== false;
  }
  if (data[KEY_LIST] === undefined) {
    patch[KEY_LIST] = true;
  }
  if (Object.keys(patch).length) {
    await chrome.storage.local.set(patch);
  }
}

async function getSettings() {
  await migrateSettings();
  const data = await chrome.storage.local.get({
    [KEY_COPY]: true,
    [KEY_LIST]: true
  });
  return {
    copyShareEnabled: data[KEY_COPY] !== false,
    listLayoutEnabled: data[KEY_LIST] !== false
  };
}

async function applyUiState(settings) {
  const anyOn = settings.copyShareEnabled || settings.listLayoutEnabled;
  await chrome.action.setIcon({ path: anyOn ? ICONS_ON : ICONS_OFF });
  await chrome.action.setTitle({
    title: chrome.i18n.getMessage(anyOn ? 'toggleOnTitle' : 'toggleOffTitle')
  });

  await new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!settings.copyShareEnabled) {
        resolve();
        return;
      }
      chrome.contextMenus.create(
        {
          id: MENU_ID,
          title: chrome.i18n.getMessage('copyShareLink'),
          contexts: ['page', 'link', 'selection'],
          documentUrlPatterns: DOCUMENT_URL_PATTERNS
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        }
      );
    });
  });
}

function queueUiState(settings) {
  uiStateQueue = uiStateQueue.catch(() => {}).then(() => applyUiState(settings));
  return uiStateQueue;
}

async function init() {
  await queueUiState(await getSettings());
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (!changes[KEY_COPY] && !changes[KEY_LIST] && !changes[KEY_LEGACY]) return;
  await queueUiState(await getSettings());
});
init();

async function copyTextToTab(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (value) => {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (!ok) throw new Error('copy failed');
        return true;
      }
    },
    args: [text]
  });
}

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: chrome.i18n.getMessage('extName'),
    message
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  if (!(await getSettings()).copyShareEnabled) return;

  const shareLink = [info.linkUrl, info.pageUrl, tab?.url]
    .filter(Boolean)
    .map(toShareLink)
    .find(Boolean);

  if (!shareLink) {
    notify(chrome.i18n.getMessage('notProductPage'));
    return;
  }

  try {
    if (!tab?.id) throw new Error('no tab');
    await copyTextToTab(tab.id, shareLink);
    notify(chrome.i18n.getMessage('copySuccess', [shareLink]));
  } catch (err) {
    console.error(err);
    notify(chrome.i18n.getMessage('copyFailed'));
  }
});
