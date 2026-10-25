import { getText } from './fr';
import type { NarrationService } from './types';

const PREFERRED_VOICE_NAMES = [
  'google',
  'amélie',
  'amelie',
  'thomas',
  'siri',
  'audrey',
  'aurelie',
  'marie',
];

export function pickFrenchVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const french = voices.filter((voice) => voice.lang.toLowerCase().startsWith('fr'));
  if (french.length === 0) {
    return null;
  }

  const france = french.filter(
    (voice) => voice.lang.toLowerCase() === 'fr-fr',
  );
  const pool = france.length > 0 ? france : french;

  for (const preferredName of PREFERRED_VOICE_NAMES) {
    const match = pool.find((voice) =>
      voice.name.toLowerCase().includes(preferredName),
    );
    if (match !== undefined) {
      return match;
    }
  }

  return pool.find((voice) => voice.default) ?? pool[0] ?? null;
}

export class SpeechNarrationService implements NarrationService {
  private muted = false;
  private rate = 0.9;
  private lastTextId: string | null = null;
  private pendingResolve: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private unlocked = false;
  private priming = false;
  private primeWatchdog: number | null = null;
  private startTimer: number | null = null;

  private readonly handleVoicesChanged = (): void => {
    this.voices = this.getVoices();
  };

  private readonly handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      // Mobile engines often need a fresh gesture after returning from the
      // background, so let the next tap prime the synthesizer again.
      this.unlocked = false;
      this.priming = false;
      this.stop();
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.voices = this.getVoices();
      this.getSynthesis()?.addEventListener?.('voiceschanged', this.handleVoicesChanged);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  unlock(): void {
    const synthesis = this.getSynthesis();
    const Utterance = this.getUtteranceConstructor();
    if (!synthesis || !Utterance) {
      return;
    }

    if (this.unlocked || this.priming) {
      return;
    }

    this.playSilentAudio();
    this.priming = true;

    const utterance = new Utterance(' ');
    utterance.lang = 'fr-FR';
    utterance.volume = 0.01;
    utterance.rate = 2;

    const confirm = (): void => {
      this.unlocked = true;
      this.priming = false;
      this.clearPrimeWatchdog();
    };

    utterance.onstart = confirm;
    utterance.onend = confirm;
    utterance.onerror = () => {
      this.priming = false;
      this.clearPrimeWatchdog();
    };

    // The silent prime must run inside the user gesture, before any await.
    synthesis.speak(utterance);

    // Some engines never fire onstart for a silent utterance. Clear the
    // state and let the next tap prime again rather than blocking forever.
    this.primeWatchdog = window.setTimeout(() => {
      this.primeWatchdog = null;
      if (this.unlocked) {
        return;
      }
      this.priming = false;
      this.getSynthesis()?.cancel();
    }, 1500);
  }

  async speak(textId: string): Promise<void> {
    this.lastTextId = textId;
    const text = getText(textId);

    if (this.muted || text === '') {
      this.stop();
      return;
    }

    const synthesis = this.getSynthesis();
    const Utterance = this.getUtteranceConstructor();
    if (!synthesis || !Utterance) {
      return;
    }

    const currentVoices = this.getVoices();
    if (currentVoices.length > 0) {
      this.voices = currentVoices;
    }

    const voice = pickFrenchVoice(this.voices);
    if (this.voices.length > 0 && voice === null) {
      // A known voice list without French keeps the text bubble only; an
      // empty list is different: the device has not reported its voices yet,
      // so let the engine pick a French voice from `lang`.
      return;
    }

    this.clearStartTimer();
    this.resolvePending();

    return new Promise<void>((resolve) => {
      let settled = false;
      let watchdog: number | null = null;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (watchdog !== null) {
          window.clearTimeout(watchdog);
          watchdog = null;
        }
        if (this.pendingResolve === finish) {
          this.pendingResolve = null;
        }
        resolve();
      };

      this.pendingResolve = finish;

      const utterance = new Utterance(text);
      utterance.lang = voice?.lang || 'fr-FR';
      if (voice !== undefined) {
        utterance.voice = voice;
      }
      utterance.rate = this.rate;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      utterance.onstart = () => {
        this.unlocked = true;
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      const begin = (): void => {
        // A silently dropped utterance may never fire onend; release the UI
        // after a generous delay instead of animating forever.
        watchdog = window.setTimeout(finish, 12_000);
        synthesis.speak(utterance);
      };

      const busy = synthesis.speaking || synthesis.pending;

      if (!busy || this.priming) {
        // Queue behind the silent prime when it is still pending: cancelling
        // it would lose the mobile unlock.
        begin();
        return;
      }

      // Android can drop an utterance spoken in the same tick as cancel().
      synthesis.cancel();
      this.startTimer = window.setTimeout(() => {
        this.startTimer = null;
        begin();
      }, 140);
    });
  }

  stop(): void {
    this.clearStartTimer();
    this.clearPrimeWatchdog();
    this.priming = false;
    this.getSynthesis()?.cancel();
    this.resolvePending();
  }

  async replay(): Promise<void> {
    if (this.lastTextId !== null) {
      await this.speak(this.lastTextId);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  setRate(rate: number): void {
    this.rate = Math.min(1.25, Math.max(0.65, rate));
  }

  destroy(): void {
    this.clearStartTimer();
    this.clearPrimeWatchdog();
    this.stop();
    this.unlocked = false;
    this.priming = false;
    this.getSynthesis()?.removeEventListener?.('voiceschanged', this.handleVoicesChanged);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    void this.audioContext?.close();
    this.audioContext = null;
  }

  private resolvePending(): void {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.();
  }

  private clearStartTimer(): void {
    if (this.startTimer !== null) {
      window.clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  private clearPrimeWatchdog(): void {
    if (this.primeWatchdog !== null) {
      window.clearTimeout(this.primeWatchdog);
      this.primeWatchdog = null;
    }
  }

  private getSynthesis(): SpeechSynthesis | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return null;
    }
    return window.speechSynthesis;
  }

  private getVoices(): SpeechSynthesisVoice[] {
    return this.getSynthesis()?.getVoices() ?? [];
  }

  private getUtteranceConstructor(): typeof SpeechSynthesisUtterance | null {
    if (
      typeof window === 'undefined' ||
      typeof window.SpeechSynthesisUtterance !== 'function'
    ) {
      return null;
    }
    return window.SpeechSynthesisUtterance;
  }

  private playSilentAudio(): void {
    const AudioContextClass = getAudioContextConstructor();
    if (AudioContextClass === null) {
      return;
    }

    try {
      if (this.audioContext === null) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch {
      // Audio is a bonus; the text bubble remains the primary channel.
    }
  }
}

function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const globalWindow = window as Window & {
    webkitAudioContext?: new () => AudioContext;
  };

  return window.AudioContext ?? globalWindow.webkitAudioContext ?? null;
}
