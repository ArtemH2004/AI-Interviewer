// Background service worker: клик по иконке открывает боковую панель.
// Side panel, в отличие от popup, не закрывается при потере фокуса и не обрывает запись.
//
// Открываем панель вручную через action.onClicked, а не через openPanelOnActionClick:
// только так клик считается «вызовом» расширения на вкладке и выдаёт activeTab,
// без которого chrome.tabCapture не может захватить звук этой вкладки.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
});
