const API_BASE = 'http://localhost:8000';

let isRecording = false;

// Элементы DOM
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const transcriptDiv = document.getElementById('transcript');
const answerDiv = document.getElementById('answer');

// Проверка подключения к API
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();

        if (data.status === 'healthy') {
            statusIndicator.classList.add('connected');
            statusText.textContent = 'Подключено';
        }
    } catch (error) {
        statusIndicator.classList.add('disconnected');
        statusText.textContent = 'Не подключено (запустите backend)';
        console.error('API connection failed:', error);
    }
}

// Начать запись
startBtn.addEventListener('click', async () => {
    isRecording = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    transcriptDiv.textContent = 'Идет запись...';
    answerDiv.textContent = '';

    // TODO: Реализовать захват аудио и отправку на backend
    console.log('Recording started');
});

// Остановить запись
stopBtn.addEventListener('click', async () => {
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    // TODO: Остановить запись и обработать аудио
    console.log('Recording stopped');

    // Симуляция работы
    transcriptDiv.textContent = 'Обработка аудио...';

    setTimeout(() => {
        transcriptDiv.textContent = 'Расскажите о своем опыте работы с JavaScript?';
        answerDiv.textContent = 'Генерация ответа...';

        setTimeout(() => {
            answerDiv.textContent = 'У меня есть опыт работы с JavaScript более 3 лет. Работал с современными фреймворками, включая React и Vue.js...';
        }, 1500);
    }, 1000);
});

// Проверка подключения при загрузке
checkAPIConnection();
