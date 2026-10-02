const API_BASE = 'http://localhost:8000';

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const transcriptInput = document.getElementById('transcript');
const answerDiv = document.getElementById('answer');
const generateBtn = document.getElementById('generate-btn');

async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        if (!response.ok) throw new Error('API unavailable');
        const data = await response.json();
        const ready = data.models.qwen === 'ready';
        statusIndicator.classList.add(ready ? 'connected' : 'disconnected');
        statusText.textContent = ready ? 'Qwen готов' : 'Qwen недоступен: проверьте Ollama и модель';
    } catch (error) {
        statusIndicator.classList.add('disconnected');
        statusText.textContent = 'Не подключено (запустите backend)';
    }
}

generateBtn.addEventListener('click', async () => {
    const text = transcriptInput.value.trim();
    if (!text) {
        answerDiv.textContent = 'Введите вопрос.';
        return;
    }
    generateBtn.disabled = true;
    answerDiv.textContent = 'Генерация ответа...';
    try {
        const response = await fetch(`${API_BASE}/api/generate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language: 'ru' })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(typeof data.detail === 'string' ? data.detail : 'Проверьте текст вопроса.');
        }
        answerDiv.textContent = data.answer;
    } catch (error) {
        answerDiv.textContent = `Ошибка: ${error.message}`;
    } finally {
        generateBtn.disabled = false;
    }
});

checkAPIConnection();
