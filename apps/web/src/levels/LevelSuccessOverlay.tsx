import type { LevelDefinition } from '@circuits/shared/levels';
import { motion, useReducedMotion } from 'framer-motion';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { getText, getVocabulary } from '../narration/fr';
import './LevelSuccessOverlay.css';

export interface LevelSuccessOverlayProps {
  level: LevelDefinition;
  stars: number;
  hasNext: boolean;
  saveError?: boolean;
  onNext: () => void;
  onMap: () => void;
}

export function LevelSuccessOverlay({
  level,
  stars,
  hasNext,
  saveError = false,
  onNext,
  onMap,
}: LevelSuccessOverlayProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<'stars' | 'vocabulary'>('stars');
  const vocabulary = level.vocabularyIds.flatMap((id) => {
    const entry = getVocabulary(id);
    return entry === null ? [] : [{ id, entry }];
  });

  return (
    <div className="level-complete-overlay">
      <motion.div
        className="level-complete-card"
        role="dialog"
        aria-modal={false}
        aria-labelledby="level-complete-title"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
      >
        <div className="level-complete-summary">
          <div className="level-complete-summary__text">
            <p className="level-complete-eyebrow">
              {getText(level.titleTextId)}
            </p>
            <h2
              id="level-complete-title"
              className="level-complete-title"
              aria-live="polite"
            >
              {getText('success.title')}
            </h2>

            <div className="level-complete-stars" aria-label={`${stars} / 3`}>
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  initial={reduceMotion ? false : { scale: 0, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.3,
                    delay: reduceMotion ? 0 : 0.15 + index * 0.15,
                    type: 'spring',
                    stiffness: 240,
                    damping: 16,
                  }}
                >
                  <StarIcon filled={index < stars} />
                </motion.span>
              ))}
            </div>
          </div>

          {step === 'stars' ? (
            <button
              type="button"
              className="level-complete-button level-complete-button--primary"
              onPointerDown={(event) =>
                activate(event, () => setStep('vocabulary'))
              }
            >
              {getText('success.continue')}
            </button>
          ) : null}
        </div>

        {!hasNext ? (
          <p className="level-complete-chapter">{getText('map.final')}</p>
        ) : null}

        {saveError ? (
          <p className="level-complete-save-error" role="status">
            {getText('progress.saveError')}
          </p>
        ) : null}

        {step === 'vocabulary' ? (
          <>
            <h3 className="level-complete-learned">
              {getText('success.learned')}
            </h3>
            <div className="level-vocabulary">
              {vocabulary.map(({ id, entry }) => (
                <div className="level-vocabulary-card" key={id}>
                  <span className="level-vocabulary-word">{entry.word}</span>
                  <span className="level-vocabulary-definition">
                    {entry.definition}
                  </span>
                </div>
              ))}
            </div>

            <div className="level-complete-actions">
              {hasNext ? (
                <button
                  type="button"
                  className="level-complete-button level-complete-button--primary"
                  onPointerDown={(event) => activate(event, onNext)}
                >
                  {getText('success.next')}
                </button>
              ) : null}
              <button
                type="button"
                className="level-complete-button level-complete-button--secondary"
                onPointerDown={(event) => activate(event, onMap)}
              >
                {getText('success.map')}
              </button>
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9z"
        fill={filled ? '#ffb703' : 'rgba(255, 255, 255, 0.2)'}
        stroke={filled ? '#d97706' : 'rgba(36, 50, 74, 0.2)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function activate(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: () => void,
): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  action();
}
