const KEY_COPY = 'copyShareEnabled';
const KEY_LIST = 'listLayoutEnabled';

function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

async function load() {
  document.getElementById('title').textContent = t('extName');
  document.getElementById('subtitle').textContent = t('extDescription');
  document.getElementById('copyLabel').textContent = t('featureCopyShare');
  document.getElementById('copyDesc').textContent = t('featureCopyShareDesc');
  document.getElementById('listLabel').textContent = t('featureListLayout');
  document.getElementById('listDesc').textContent = t('featureListLayoutDesc');

  const data = await chrome.storage.local.get({
    [KEY_COPY]: true,
    [KEY_LIST]: true
  });

  const copyEl = document.getElementById('copyShareEnabled');
  const listEl = document.getElementById('listLayoutEnabled');
  copyEl.checked = data[KEY_COPY] !== false;
  listEl.checked = data[KEY_LIST] !== false;

  copyEl.addEventListener('change', async () => {
    await chrome.storage.local.set({ [KEY_COPY]: copyEl.checked });
  });

  listEl.addEventListener('change', async () => {
    await chrome.storage.local.set({ [KEY_LIST]: listEl.checked });
  });
}

load();
