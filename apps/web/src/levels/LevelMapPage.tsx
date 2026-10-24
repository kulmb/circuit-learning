import {
  CHAPTER_1_LEVELS,
  CHAPTER_1_TITLE_ID,
  type LevelDefinition,
  type LevelProgress,
  type PlayerProgress,
} from '@circuits/shared';
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { ZapCharacter } from '../components/Zap';
import { getText } from '../narration/fr';
import { localProgressRepository } from '../progress/LocalProgressRepository';
import './LevelMapPage.css';

export interface LevelMapPageProps {
  onBack: () => void;
  onSelectLevel: (levelId: string) => void;
}

export function LevelMapPage({ onBack, onSelectLevel }: LevelMapPageProps) {
  const [progress, setProgress] = useState<PlayerProgress | null>(null);

  useEffect(() => {
    let active = true;
    void localProgressRepository.getProgress().then((value) => {
      if (active) {
        setProgress(value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="level-map">
      <header className="level-map__header">
        <button
          type="button"
          className="level-map__back"
          onPointerDown={(event) =>
            activate(event, onBack)
          }
        >
          <span aria-hidden="true">←</span>
          <span>{getText('map.back')}</span>
        </button>

        <div className="level-map__heading">
          <h1>{getText(CHAPTER_1_TITLE_ID)}</h1>
          <p>{getText('map.subtitle')}</p>
        </div>

        <ZapCharacter
          expression="content"
          speaking={false}
          className="level-map__zap"
        />
      </header>

      {progress === null ? (
        <div className="level-map__loading" aria-hidden="true" />
      ) : (
        <ol className="level-map__path">
          {CHAPTER_1_LEVELS.map((level) => {
            const levelProgress = progress.levels[level.id];
            return (
              <li key={level.id} className="level-map__item">
                <LevelNode
                  level={level}
                  progress={levelProgress}
                  onSelect={onSelectLevel}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

interface LevelNodeProps {
  level: LevelDefinition;
  progress: LevelProgress | undefined;
  onSelect: (levelId: string) => void;
}

function LevelNode({ level, progress, onSelect }: LevelNodeProps) {
  const status = progress?.status ?? 'locked';
  const stars = progress?.stars ?? 0;
  const locked = status === 'locked';
  const completed = status === 'completed';
  const isTransition = level.kind === 'matching';

  return (
    <button
      type="button"
      className={`level-node level-node--${status}${isTransition ? ' level-node--transition' : ''}`}
      data-level-id={level.id}
      disabled={locked}
      onPointerDown={(event) => {
        if (locked) {
          return;
        }
        activate(event, () => onSelect(level.id));
      }}
    >
      <span className="level-node__badge">
        {isTransition ? (
          <SymbolIcon />
        ) : (
          level.number
        )}
      </span>

      <span className="level-node__card">
        <span className="level-node__label">
          {isTransition
            ? getText('map.transition')
            : `${getText('map.level')} ${level.number ?? ''}`}
        </span>
        <span className="level-node__title">
          {getText(level.titleTextId)}
        </span>

        {completed ? (
          <span className="level-node__stars" aria-label={`${stars} / 3`}>
            {[0, 1, 2].map((index) => (
              <StarIcon key={index} filled={index < stars} />
            ))}
          </span>
        ) : locked ? (
          <span className="level-node__status">
            <LockIcon />
            <span>{getText('map.locked')}</span>
          </span>
        ) : (
          <span className="level-node__status level-node__status--play">
            <PlayIcon />
          </span>
        )}
      </span>
    </button>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9z"
        fill={filled ? '#ffb703' : 'rgba(36, 50, 74, 0.16)'}
        stroke={filled ? '#d97706' : 'transparent'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor" />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function SymbolIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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
