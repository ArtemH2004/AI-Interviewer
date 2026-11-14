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

async function pickTabWithAudio(): Promise<MediaStream> {
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
  stream.getVideoTracks().forEach((t) => t.stop());
  return stream;
}

export class AudioRecorder {
  private streams: MediaStream[] = [];
  private context?: AudioContext;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private frame = 0;

  async start(source: AudioSource, onLevel: (level: number) => void) {
    let micStream: MediaStream | undefined;
    let tabStream: MediaStream | undefined;
    try {
      // getDisplayMedia must be called directly from the recording button's user gesture.
      if (source !== 'mic') tabStream = await pickTabWithAudio();
      if (source !== 'tab') micStream = await getMicStream();
    } catch (error) {
      micStream?.getTracks().forEach((t) => t.stop());
      tabStream?.getTracks().forEach((t) => t.stop());
      throw error;
    }
    this.streams = [micStream, tabStream].filter((s): s is MediaStream => !!s);

    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    for (const stream of this.streams) {
      const node = context.createMediaStreamSource(stream);
      node.connect(destination);
      node.connect(analyser);
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
