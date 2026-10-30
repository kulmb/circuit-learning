import type { ChangeEvent } from 'react';

import {
  LANGUAGES,
  useLanguage,
  type LanguageOption,
} from './LanguageContext';
import type { Language } from '../narration/fr';
import './LanguageSwitcher.css';

/**
 * A native select keeps the picker reliable on iPad and Android while the
 * fixed-size wrapper stops the header from moving when the label changes.
 */
export function LanguageSwitcher({
  className = '',
}: {
  className?: string;
}) {
  const { language, setLanguage } = useLanguage();

  function choose(event: ChangeEvent<HTMLSelectElement>): void {
    setLanguage(event.target.value as Language);
  }

  return (
    <div className={`language-switcher ${className}`.trim()}>
      <span className="language-switcher__icon" aria-hidden="true">
        <GlobeIcon />
      </span>
      <select
        className="language-switcher__select"
        aria-label="Langue / Language / 语言"
        title="Français · English · 中文"
        value={language}
        onChange={choose}
      >
        {LANGUAGES.map((option: LanguageOption) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="language-switcher__chevron" aria-hidden="true">
        <ChevronIcon />
      </span>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="m6 9 6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
