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

  private readonly handleVoicesChanged = (): void => {
    this.voices = this.getVoices();
  };

  private readonly handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
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
    this.playSilentAudio();

    const synthesis = this.getSynthesis();
    const Utterance = this.getUtteranceConstructor();
    if (!synthesis || !Utterance) {
      return;
    }

    const utterance = new Utterance('');
    utterance.volume = 0;
    utterance.rate = 1;
    synthesis.speak(utterance);
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
    if (!voice) {
      // The bubble text is still shown by the UI; never speak French with an
      // unrelated fallback voice.
      return;
    }

    this.stop();

    return new Promise<void>((resolve) => {
      let settled = false;
      this.pendingResolve = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.pendingResolve = null;
        resolve();
      };

      const utterance = new Utterance(text);
      utterance.lang = voice.lang || 'fr-FR';
      utterance.voice = voice;
      utterance.rate = this.rate;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      utterance.onend = this.pendingResolve;
      utterance.onerror = this.pendingResolve;
      synthesis.speak(utterance);
    });
  }

  stop(): void {
    this.getSynthesis()?.cancel();
    this.pendingResolve?.();
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
    this.stop();
    this.getSynthesis()?.removeEventListener?.('voiceschanged', this.handleVoicesChanged);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    void this.audioContext?.close();
    this.audioContext = null;
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
