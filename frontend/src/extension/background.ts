// Background service worker: клик по иконке открывает боковую панель.
// Side panel, в отличие от popup, не закрывается при потере фокуса и не обрывает запись.
//
// Открываем панель по нажатию на иконку расширения.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
});
