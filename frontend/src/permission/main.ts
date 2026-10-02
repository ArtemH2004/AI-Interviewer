// Боковая панель не умеет показывать запрос разрешения на микрофон,
// поэтому запрашиваем его в обычной вкладке: разрешение выдаётся всему расширению.
import '../styles.css';
import { applyStoredTheme } from '../lib/theme';

void applyStoredTheme();

const message = document.getElementById('message')!;
const retry = document.getElementById('retry')!;

async function requestMic() {
  retry.classList.add('hidden');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    message.textContent = 'Готово! Вкладку можно закрыть и вернуться к боковой панели.';
    setTimeout(() => window.close(), 1500);
  } catch {
    message.textContent =
      'Доступ не выдан. Разрешите микрофон в настройках сайта (значок слева от адреса) и попробуйте снова.';
    retry.classList.remove('hidden');
  }
}

retry.addEventListener('click', requestMic);
void requestMic();
