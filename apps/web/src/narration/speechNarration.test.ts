import { afterEach, describe, expect, it, vi } from 'vitest';

import { getText, setActiveLanguage } from './fr';
import {
  pickFrenchVoice,
  pickVoice,
  SpeechNarrationService,
} from './speechNarration';
import { textsEn } from './texts.en';

function voice(name: string, lang: string, isDefault = false): SpeechSynthesisVoice {
  return { name, lang, default: isDefault } as SpeechSynthesisVoice;
}

interface FakeUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface FakeSynthesis {
  speaking: boolean;
  pending: boolean;
  spoken: FakeUtterance[];
  cancels: number;
  speak(utterance: FakeUtterance): void;
  cancel(): void;
  getVoices(): SpeechSynthesisVoice[];
  addEventListener(): void;
  removeEventListener(): void;
}

function installSpeech(
  voices: SpeechSynthesisVoice[],
  options: { complete?: boolean } = {},
): FakeSynthesis {
  const complete = options.complete ?? true;
  const fake: FakeSynthesis = {
    speaking: false,
    pending: false,
    spoken: [],
    cancels: 0,
    speak(utterance) {
      fake.spoken.push(utterance);
      if (!complete) {
        return;
      }
      fake.speaking = true;
      utterance.onstart?.();
      fake.speaking = false;
      utterance.onend?.();
    },
    cancel() {
      fake.cancels += 1;
      fake.speaking = false;
      fake.pending = false;
    },
    getVoices: () => voices,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };

  class FakeSpeechSynthesisUtterance implements FakeUtterance {
    text: string;
    lang = '';
    voice: SpeechSynthesisVoice | null = null;
    volume = 1;
    rate = 1;
    pitch = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(text = '') {
      this.text = text;
    }
  }

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: fake,
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeSpeechSynthesisUtterance,
  });

  return fake;
}

afterEach(() => {
  vi.useRealTimers();
  setActiveLanguage('fr');
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
});

describe('French voice selection', () => {
  it('prefers a known high-quality French voice', () => {
    const voices = [
      voice('Thomas', 'fr-FR'),
      voice('Amélie', 'fr-FR'),
      voice('English', 'en-US'),
    ];

    expect(pickFrenchVoice(voices)?.name).toBe('Amélie');
  });

  it('prefers fr-FR over another French locale', () => {
    const voices = [voice('Google français', 'fr-CA'), voice('Voix standard', 'fr-FR')];

    expect(pickFrenchVoice(voices)?.name).toBe('Voix standard');
  });

  it('uses a French voice when no fr-FR voice exists', () => {
    const voices = [voice('Google français', 'fr-CA')];

    expect(pickFrenchVoice(voices)?.name).toBe('Google français');
  });

  it('returns null when the device has no French voice', () => {
    expect(pickFrenchVoice([voice('English', 'en-US')])).toBeNull();
  });

  it('selects an English or Chinese voice for the active language', () => {
    const voices = [
      voice('Thomas', 'fr-FR'),
      voice('Samantha', 'en-US'),
      voice('Ting-Ting', 'zh-CN'),
    ];

    expect(pickVoice(voices, 'en')?.name).toBe('Samantha');
    expect(pickVoice(voices, 'zh')?.name).toBe('Ting-Ting');
    expect(pickVoice([voice('Thomas', 'fr-FR')], 'en')).toBeNull();
  });
});

describe('mobile speech unlock', () => {
  it('primes the synthesizer and speaks the next text without cancelling', async () => {
    const fake = installSpeech([voice('Amélie', 'fr-FR')]);
    const service = new SpeechNarrationService();

    service.unlock();
    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0]?.text).toBe(' ');
    expect(fake.spoken[0]?.volume).toBeCloseTo(0.01);

    await service.speak('zap.welcome');

    expect(fake.cancels).toBe(0);
    expect(fake.spoken.at(-1)?.text).toBe(getText('zap.welcome'));
    expect(fake.spoken.at(-1)?.voice?.name).toBe('Amélie');

    service.destroy();
  });

  it('queues the real text behind a silent prime that is still pending', async () => {
    const fake = installSpeech([voice('Amélie', 'fr-FR')], {
      complete: false,
    });
    const service = new SpeechNarrationService();

    service.unlock();
    void service.speak('zap.welcome');

    expect(fake.cancels).toBe(0);
    expect(fake.spoken).toHaveLength(2);
    expect(fake.spoken[1]?.text).toBe(getText('zap.welcome'));

    service.destroy();
  });

  it('interrupts a running narration after a short delay for Android', async () => {
    vi.useFakeTimers();
    const fake = installSpeech([voice('Amélie', 'fr-FR')]);
    const service = new SpeechNarrationService();
    fake.speaking = true;

    void service.speak('zap.welcome');

    expect(fake.cancels).toBe(1);
    expect(fake.spoken).toHaveLength(0);

    vi.advanceTimersByTime(140);

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0]?.text).toBe(getText('zap.welcome'));

    service.destroy();
  });

  it('speaks the English text with an English voice', async () => {
    setActiveLanguage('en');
    const fake = installSpeech([voice('Samantha', 'en-US')]);
    const service = new SpeechNarrationService();

    await service.speak('home.play');

    expect(fake.spoken.at(-1)?.text).toBe(textsEn['home.play']);
    expect(fake.spoken.at(-1)?.lang).toBe('en-US');
    expect(fake.spoken.at(-1)?.voice?.name).toBe('Samantha');

    service.destroy();
  });

  it('still speaks with lang fr-FR when the voice list is not loaded yet', async () => {
    const fake = installSpeech([]);
    const service = new SpeechNarrationService();

    await service.speak('zap.welcome');

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0]?.lang).toBe('fr-FR');
    expect(fake.spoken[0]?.voice).toBeNull();

    service.destroy();
  });

  it('keeps the text bubble only when no French voice exists', async () => {
    const fake = installSpeech([voice('English', 'en-US')]);
    const service = new SpeechNarrationService();

    await service.speak('zap.welcome');

    expect(fake.spoken).toHaveLength(0);

    service.destroy();
  });
});
