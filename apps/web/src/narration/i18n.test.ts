import { afterEach, describe, expect, it } from 'vitest';

import {
  fr,
  getText,
  getVocabulary,
  setActiveLanguage,
  texts,
  type TextId,
} from './fr';
import { textsEn } from './texts.en';
import { textsZh } from './texts.zh';

const frenchKeys = Object.keys(texts) as TextId[];

describe('narration dictionaries', () => {
  afterEach(() => {
    setActiveLanguage('fr');
  });

  it('has an English and a Chinese value for every French key', () => {
    for (const key of frenchKeys) {
      expect(textsEn[key], `en ${key}`).toEqual(expect.any(String));
      expect(textsEn[key].length, `en ${key}`).toBeGreaterThan(0);
      expect(textsZh[key], `zh ${key}`).toEqual(expect.any(String));
      expect(textsZh[key].length, `zh ${key}`).toBeGreaterThan(0);
    }
  });

  it('switches getText and vocabulary without a reload', () => {
    expect(getText('home.title')).toBe(texts['home.title']);

    setActiveLanguage('en');
    expect(getText('home.title')).toBe(textsEn['home.title']);
    expect(getVocabulary('circuitFerme')?.word).toBe(
      textsEn['vocab.circuitFerme.word'],
    );

    setActiveLanguage('zh');
    expect(getText('home.title')).toBe(textsZh['home.title']);
    expect(getVocabulary('circuitFerme')?.word).toBe(
      textsZh['vocab.circuitFerme.word'],
    );
  });

  it('resolves nested fr aliases through the active dictionary', () => {
    setActiveLanguage('en');

    expect(fr.home.title).toBe(textsEn['home.title']);
    expect(fr.components.battery.label).toBe(
      textsEn['component.battery.label'],
    );
    expect(fr.workbench.displayMode).toBe(textsEn['display.mode']);

    setActiveLanguage('zh');
    expect(fr.home.title).toBe(textsZh['home.title']);
    expect(fr.components.bulb.label).toBe(
      textsZh['component.bulb.label'],
    );
  });
});
