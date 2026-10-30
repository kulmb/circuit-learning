import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { vibrateSuccess, supportsVibration } from '../feedback/haptics';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { getText } from '../narration/fr';
import { narrationService, unlockNarration } from '../narration/narrationService';
import { usePerformance } from '../performance/PerformanceContext';
import { localProgressRepository } from '../progress/LocalProgressRepository';
import { createParentChallenge, type ParentChallenge } from './challenge';
import {
  readPreferences,
  setSoundEnabled,
  setSpeechRate,
  setVibrationEnabled,
  type Preferences,
  type SpeechRate,
} from './preferences';
import './ParentSettingsPage.css';

export interface ParentSettingsPageProps {
  onBack: () => void;
}

const RATE_OPTIONS: readonly {
  rate: SpeechRate;
  labelKey: string;
}[] = [
  { rate: 'slow', labelKey: 'parentSettings.voiceSlow' },
  { rate: 'normal', labelKey: 'parentSettings.voiceNormal' },
  { rate: 'fast', labelKey: 'parentSettings.voiceFast' },
];

export function ParentSettingsPage({ onBack }: ParentSettingsPageProps) {
  useLanguage();
  const {
    lowPerformance,
    autoLow,
    prefersReducedMotion,
    setLowPerformance,
  } = usePerformance();
  const [unlocked, setUnlocked] = useState(false);
  const [challenge, setChallenge] = useState<ParentChallenge>(() =>
    createParentChallenge(),
  );
  const [gateError, setGateError] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() =>
    readPreferences(),
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const vibrationSupported = supportsVibration();

  useEffect(() => {
    if (!confirmReset) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [confirmReset]);

  function answer(value: number): void {
    if (value === challenge.answer) {
      setUnlocked(true);
      setGateError(false);
      return;
    }

    setGateError(true);
    setChallenge(createParentChallenge());
  }

  function toggleSound(): void {
    const next = !preferences.sound;
    setSoundEnabled(next);
    setPreferences((current) => ({ ...current, sound: next }));
  }

  function chooseRate(rate: SpeechRate): void {
    setSpeechRate(rate);
    setPreferences((current) => ({ ...current, speechRate: rate }));
    unlockNarration();
    void narrationService.speak('parentSettings.voiceSample');
  }

  function toggleVibration(): void {
    if (!vibrationSupported) {
      return;
    }

    const next = !preferences.vibration;
    setVibrationEnabled(next);
    setPreferences((current) => ({ ...current, vibration: next }));

    if (next) {
      vibrateSuccess();
    }
  }

  function toggleLowPerformance(): void {
    setLowPerformance(!lowPerformance);
  }

  function resetProgress(): void {
    localProgressRepository.resetLocalProgress();
    setConfirmReset(false);
    setResetDone(true);
  }

  return (
    <div className="parent-settings">
      <header className="parent-settings__header">
        <button
          type="button"
          className="parent-settings__back"
          onPointerDown={(event) => activate(event, onBack)}
        >
          <span aria-hidden="true">←</span>
          <span>{getText('parentSettings.back')}</span>
        </button>

        <div className="parent-settings__heading">
          <h1>{getText('parentSettings.title')}</h1>
          <p>{getText('parentSettings.subtitle')}</p>
        </div>

        <LanguageSwitcher />
      </header>

      {!unlocked ? (
        <main className="parent-gate">
          <section
            className="parent-settings__card parent-gate__card"
            aria-labelledby="parent-gate-title"
          >
            <h2 id="parent-gate-title">
              {getText('parentSettings.gateTitle')}
            </h2>
            <p className="parent-gate__question">
              {getText('parentSettings.question')} {challenge.a} ×{' '}
              {challenge.b} ?
            </p>

            <div className="parent-gate__choices">
              {challenge.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="parent-gate__choice"
                  onPointerDown={(event) =>
                    activate(event, () => answer(choice))
                  }
                >
                  {choice}
                </button>
              ))}
            </div>

            {gateError ? (
              <p className="parent-gate__error" role="alert">
                {getText('parentSettings.gateError')}
              </p>
            ) : null}

            <p className="parent-settings__hint">
              {getText('parentSettings.gateHint')}
            </p>
          </section>
        </main>
      ) : (
        <main className="parent-settings__content">
          <p className="parent-settings__unlocked" role="status">
            {getText('parentSettings.unlocked')}
          </p>

          <section
            className="parent-settings__card"
            aria-labelledby="parent-sound-title"
          >
            <h2 id="parent-sound-title">
              {getText('parentSettings.soundTitle')}
            </h2>
            <p className="parent-settings__description">
              {getText('parentSettings.soundHint')}
            </p>
            <button
              type="button"
              className={`parent-toggle${preferences.sound ? ' is-on' : ''}`}
              aria-pressed={preferences.sound}
              onPointerDown={(event) => activate(event, toggleSound)}
            >
              {preferences.sound
                ? getText('parentSettings.soundOn')
                : getText('parentSettings.soundOff')}
            </button>
          </section>

          <section
            className="parent-settings__card"
            aria-labelledby="parent-voice-title"
          >
            <h2 id="parent-voice-title">
              {getText('parentSettings.voiceTitle')}
            </h2>
            <p className="parent-settings__description">
              {getText('parentSettings.voiceHint')}
            </p>
            <div className="parent-rate">
              {RATE_OPTIONS.map((option) => (
                <button
                  key={option.rate}
                  type="button"
                  className={`parent-rate__button${preferences.speechRate === option.rate ? ' is-selected' : ''}`}
                  aria-pressed={preferences.speechRate === option.rate}
                  onPointerDown={(event) =>
                    activate(event, () => chooseRate(option.rate))
                  }
                >
                  {getText(option.labelKey)}
                </button>
              ))}
            </div>
          </section>

          <section
            className="parent-settings__card"
            aria-labelledby="parent-vibration-title"
          >
            <h2 id="parent-vibration-title">
              {getText('parentSettings.vibrationTitle')}
            </h2>
            <p className="parent-settings__description">
              {getText('parentSettings.vibrationHint')}
            </p>
            <button
              type="button"
              className={`parent-toggle${preferences.vibration ? ' is-on' : ''}`}
              aria-pressed={preferences.vibration}
              disabled={!vibrationSupported}
              onPointerDown={(event) => activate(event, toggleVibration)}
            >
              {preferences.vibration
                ? getText('parentSettings.vibrationOn')
                : getText('parentSettings.vibrationOff')}
            </button>
            {!vibrationSupported ? (
              <p className="parent-settings__hint">
                {getText('parentSettings.vibrationUnsupported')}
              </p>
            ) : null}
          </section>

          <section
            className="parent-settings__card"
            aria-labelledby="parent-low-title"
          >
            <h2 id="parent-low-title">
              {getText('parentSettings.lowTitle')}
            </h2>
            <p className="parent-settings__description">
              {getText('parentSettings.lowHint')}
            </p>
            <button
              type="button"
              className={`parent-toggle${lowPerformance ? ' is-on' : ''}`}
              aria-pressed={lowPerformance}
              disabled={prefersReducedMotion}
              onPointerDown={(event) =>
                activate(event, toggleLowPerformance)
              }
            >
              {lowPerformance
                ? getText('parentSettings.lowOn')
                : getText('parentSettings.lowOff')}
            </button>
            {prefersReducedMotion ? (
              <p className="parent-settings__hint">
                {getText('parentSettings.lowReduced')}
              </p>
            ) : autoLow ? (
              <p className="parent-settings__hint">
                {getText('parentSettings.lowAuto')}
              </p>
            ) : null}
          </section>

          <section
            className="parent-settings__card parent-settings__card--danger"
            aria-labelledby="parent-reset-title"
          >
            <h2 id="parent-reset-title">
              {getText('parentSettings.resetTitle')}
            </h2>
            <p className="parent-settings__description">
              {getText('parentSettings.resetHint')}
            </p>
            <p className="parent-settings__hint">
              {getText('parentSettings.resetAccountNote')}
            </p>
            <button
              type="button"
              className="parent-reset"
              onPointerDown={(event) =>
                activate(event, () => setConfirmReset(true))
              }
            >
              {getText('parentSettings.reset')}
            </button>
            {resetDone ? (
              <p className="parent-settings__done" role="status">
                {getText('parentSettings.resetDone')}
              </p>
            ) : null}
          </section>
        </main>
      )}

      {confirmReset ? (
        <div
          className="parent-settings__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-reset-confirm-title"
        >
          <section className="parent-settings__confirm">
            <h2 id="parent-reset-confirm-title">
              {getText('parentSettings.resetConfirmTitle')}
            </h2>
            <p>{getText('parentSettings.resetConfirmText')}</p>
            <div className="parent-settings__confirm-actions">
              <button
                type="button"
                className="parent-reset"
                onPointerDown={(event) => activate(event, resetProgress)}
              >
                {getText('parentSettings.resetYes')}
              </button>
              <button
                type="button"
                className="parent-settings__cancel"
                onPointerDown={(event) =>
                  activate(event, () => setConfirmReset(false))
                }
              >
                {getText('parentSettings.resetNo')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function activate(
  event: ReactPointerEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}

export default ParentSettingsPage;
