type AudioContextConstructor = new () => AudioContext;

let audioContext: AudioContext | null = null;
let muted = false;

export function setAudioMuted(next: boolean): void {
  muted = next;
}

export function isAudioMuted(): boolean {
  return muted;
}

export function unlockAudio(): void {
  const AudioContextClass = getAudioContextConstructor();
  if (AudioContextClass === null) {
    return;
  }

  if (audioContext === null) {
    try {
      audioContext = new AudioContextClass();
    } catch {
      return;
    }
  }

  if (audioContext.state === 'running') {
    return;
  }

  if (audioContext.state === 'suspended') {
    const context = audioContext;
    void context
      .resume()
      .then(() => {
        if (context.state === 'running') {
          primeSilentAudio(context);
        }
      })
      .catch(() => undefined);
  }
}

function primeSilentAudio(context: AudioContext): void {
  try {
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
  } catch {
    // Audio is a bonus; the visual feedback remains the primary channel.
  }
}

export function playBuzzerBeep(): void {
  if (muted || audioContext === null) {
    return;
  }

  if (audioContext.state === 'suspended') {
    void audioContext
      .resume()
      .then(() => {
        if (audioContext !== null) {
          emitBeep(audioContext);
        }
      })
      .catch(() => undefined);
    return;
  }

  if (audioContext.state === 'running') {
    emitBeep(audioContext);
  }
}

export function playSuccessFanfare(): void {
  if (muted || audioContext === null) {
    return;
  }

  if (audioContext.state === 'suspended') {
    void audioContext
      .resume()
      .then(() => {
        if (audioContext !== null) {
          emitFanfare(audioContext);
        }
      })
      .catch(() => undefined);
    return;
  }

  if (audioContext.state === 'running') {
    emitFanfare(audioContext);
  }
}

function emitFanfare(context: AudioContext): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const start = context.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * 0.09;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.03, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.2);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.22);
  });
}

function emitBeep(context: AudioContext): void {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const globalWindow = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };

  return window.AudioContext ?? globalWindow.webkitAudioContext ?? null;
}
