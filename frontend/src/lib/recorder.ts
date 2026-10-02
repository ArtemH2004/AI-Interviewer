// Запись звука с микрофона и/или текущей вкладки (звонок в Meet, Zoom и т.п.)

export type AudioSource = 'mic' | 'tab' | 'both';

export class RecorderError extends Error {
  constructor(
    message: string,
    readonly code: 'mic-permission' | 'tab' | 'generic',
  ) {
    super(message);
  }
}

async function getMicStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    if (error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)) {
      throw new RecorderError('Нужен доступ к микрофону', 'mic-permission');
    }
    throw new RecorderError(`Микрофон недоступен: ${(error as Error).message}`, 'generic');
  }
}

function getTabStreamId(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      const lastError = chrome.runtime.lastError;
      if (lastError || !streamId) reject(new Error(lastError?.message ?? 'empty stream id'));
      else resolve(streamId);
    });
  });
}

type TabCapture = {
  stream: MediaStream;
  // tabCapture глушит звук вкладки — его нужно вернуть в динамики самим
  needsPlayback: boolean;
};

// Основной путь: chrome.tabCapture для активной вкладки, без лишних диалогов.
// Работает, если панель открыта кликом по иконке на этой вкладке (activeTab).
async function captureActiveTab(): Promise<TabCapture> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id === undefined) throw new Error('Не найдена активная вкладка');
  const streamId = await getTabStreamId(tab.id);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
  } as unknown as MediaStreamConstraints);
  return { stream, needsPlayback: true };
}

// Запасной путь: системный диалог выбора вкладки с галочкой «Поделиться звуком»
async function pickTabWithAudio(): Promise<TabCapture> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { suppressLocalAudioPlayback: false },
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      systemAudio: 'include',
    } as DisplayMediaStreamOptions);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new RecorderError('Выбор вкладки отменён', 'tab');
    }
    throw new RecorderError(`Не удалось захватить звук вкладки: ${(error as Error).message}`, 'tab');
  }
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new RecorderError('В диалоге не включён звук. Выберите вкладку и отметьте «Поделиться звуком вкладки».', 'tab');
  }
  // Видео не нужно — записываем только звук
  stream.getVideoTracks().forEach((t) => t.stop());
  return { stream, needsPlayback: false };
}

async function getTabStream(): Promise<TabCapture> {
  try {
    return await captureActiveTab();
  } catch (error) {
    console.warn('tabCapture недоступен, показываем выбор вкладки:', error);
    return pickTabWithAudio();
  }
}

export class AudioRecorder {
  private streams: MediaStream[] = [];
  private context?: AudioContext;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private frame = 0;

  async start(source: AudioSource, onLevel: (level: number) => void) {
    let micStream: MediaStream | undefined;
    let tab: TabCapture | undefined;
    try {
      if (source !== 'tab') micStream = await getMicStream();
      if (source !== 'mic') tab = await getTabStream();
    } catch (error) {
      micStream?.getTracks().forEach((t) => t.stop());
      throw error;
    }
    const tabStream = tab?.stream;
    this.streams = [micStream, tabStream].filter((s): s is MediaStream => !!s);

    // Смешиваем источники в один поток и параллельно меряем громкость
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    for (const stream of this.streams) {
      const node = context.createMediaStreamSource(stream);
      node.connect(destination);
      node.connect(analyser);
      if (stream === tabStream && tab?.needsPlayback) node.connect(context.destination);
    }
    this.context = context;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    this.chunks = [];
    this.recorder = new MediaRecorder(destination.stream, { mimeType });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);

    const samples = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += ((s - 128) / 128) ** 2;
      onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      this.frame = requestAnimationFrame(tick);
    };
    tick();
  }

  stop(): Promise<Blob> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') {
      this.cleanup();
      return Promise.resolve(new Blob());
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType }));
        this.cleanup();
      };
      recorder.stop();
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    cancelAnimationFrame(this.frame);
    this.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    this.streams = [];
    void this.context?.close();
    this.context = undefined;
    this.recorder = undefined;
  }
}
