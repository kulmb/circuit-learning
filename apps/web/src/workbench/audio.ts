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

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
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
