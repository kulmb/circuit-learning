import { describe, expect, it } from 'vitest';

import { pickFrenchVoice } from './speechNarration';

function voice(name: string, lang: string, isDefault = false): SpeechSynthesisVoice {
  return { name, lang, default: isDefault } as SpeechSynthesisVoice;
}

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
});
