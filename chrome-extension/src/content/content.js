// Content Script - внедряется на все страницы

console.log('AI Interview Assistant: Content script loaded');

// TODO: Можно добавить UI overlay для отображения подсказок прямо на странице

// Слушатель сообщений от background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showAnswer') {
        displayAnswerOverlay(request.answer);
    }
});

function displayAnswerOverlay(answer) {
    // TODO: Показать overlay с ответом на странице собеседования
    console.log('Answer to display:', answer);
}
