import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fr,
  getText,
  setActiveLanguage,
  texts,
} from '../narration/fr';
import { textsEn } from '../narration/texts.en';
import { textsZh } from '../narration/texts.zh';
import {
  LanguageProvider,
  LANGUAGE_STORAGE_KEY,
  useLanguage,
} from './LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

function Probe() {
  const { language } = useLanguage();

  return (
    <>
      <p data-testid="probe">
        {language}:{getText('home.play')}
      </p>
      <p data-testid="proxy">{fr.home.title}</p>
    </>
  );
}

describe('language provider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActiveLanguage('fr');
  });

  afterEach(() => {
    cleanup();
    setActiveLanguage('fr');
    document.documentElement.lang = 'fr';
    window.localStorage.clear();
  });

  it('defaults to French and changes language from the dropdown', () => {
    render(
      <LanguageProvider>
        <Probe />
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe(
      `fr:${texts['home.play']}`,
    );
    expect(screen.getByTestId('proxy').textContent).toBe(texts['home.title']);

    const select = screen.getByRole('combobox', { name: /Langue/i });
    expect(select).toHaveValue('fr');
    expect(screen.getByRole('option', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '中文' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'en' } });
    expect(screen.getByTestId('probe').textContent).toBe(
      `en:${textsEn['home.play']}`,
    );
    expect(screen.getByTestId('proxy').textContent).toBe(
      textsEn['home.title'],
    );
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');

    fireEvent.change(select, { target: { value: 'zh' } });
    expect(screen.getByTestId('probe').textContent).toBe(
      `zh:${textsZh['home.play']}`,
    );
    expect(document.documentElement.lang).toBe('zh-CN');

    fireEvent.change(select, { target: { value: 'fr' } });
    expect(screen.getByTestId('probe').textContent).toBe(
      `fr:${texts['home.play']}`,
    );
  });

  it('restores the stored language at startup', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('probe').textContent).toBe(
      `zh:${textsZh['home.play']}`,
    );
  });
});
