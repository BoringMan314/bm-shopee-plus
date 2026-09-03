const LIST_CLASS = 'bm-shopee-list-layout';
const KEY_LIST = 'listLayoutEnabled';

function setListLayout(enabled) {
  document.documentElement.classList.toggle(LIST_CLASS, !!enabled);
}

async function syncListLayout() {
  const data = await chrome.storage.local.get({ [KEY_LIST]: true });
  setListLayout(data[KEY_LIST] !== false);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KEY_LIST]) return;
  setListLayout(changes[KEY_LIST].newValue !== false);
});

syncListLayout();
