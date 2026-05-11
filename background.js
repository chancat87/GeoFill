/**
 * Background Script - shortcut and data cleanup support.
 */

const STORAGE_KEY = 'geoFillCachedData';
const AUTO_CLEAR_KEY = 'geoFillAutoClear';

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'geofill-fill',
      title: 'GeoFill - 打开面板',
      contexts: ['page', 'editable']
    });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenu);
createContextMenu();

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'geofill-fill') {
    try {
      if (chrome.action && chrome.action.openPopup) {
        await chrome.action.openPopup();
      } else if (typeof browser !== 'undefined' && browser.action && browser.action.openPopup) {
        await browser.action.openPopup();
      }
    } catch (error) {
      console.error('[GeoFill] 打开面板失败:', error);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-form') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const cached = result[STORAGE_KEY];
        if (cached && cached.currentData) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'fillForm',
              data: cached.currentData
            });
          } catch (sendErr) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: [
                'scripts/selectors/common.js',
                'scripts/selectors/japan.js',
                'scripts/content.js'
              ]
            });
            await chrome.tabs.sendMessage(tab.id, {
              action: 'fillForm',
              data: cached.currentData
            });
          }
        }
      } catch (error) {
        console.error('[GeoFill] 填写表单失败:', error);
      }
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    const result = await chrome.storage.local.get(AUTO_CLEAR_KEY);
    if (result[AUTO_CLEAR_KEY]) {
      await chrome.storage.local.remove([STORAGE_KEY, 'geoFillLockedFields']);
    }
  } catch (error) {
    console.error('[GeoFill] 清除数据失败:', error);
  }
});
