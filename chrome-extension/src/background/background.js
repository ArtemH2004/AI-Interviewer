// Background Service Worker для Chrome Extension

console.log('AI Interview Assistant: Background script loaded');

// Обработка сообщений от content scripts и popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);

    if (request.action === 'startRecording') {
        handleStartRecording(sendResponse);
        return true; // Асинхронный ответ
    }

    if (request.action === 'stopRecording') {
        handleStopRecording(sendResponse);
        return true;
    }
});

async function handleStartRecording(sendResponse) {
    try {
        // TODO: Начать захват аудио
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleStopRecording(sendResponse) {
    try {
        // TODO: Остановить захват и отправить на backend
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}
