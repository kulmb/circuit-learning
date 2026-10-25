import {
  avatarEmoji,
  type LevelProgress,
  type PlayerProgress,
} from '@circuits/shared';
import {
  CHAPTERS,
  type LevelDefinition,
} from '@circuits/shared/levels';
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { ZapCharacter } from '../components/Zap';
import { getText } from '../narration/fr';
import {
  PROGRESS_SYNCED_EVENT,
} from '../progress/ApiProgressRepository';
import { useProgress } from '../progress/ProgressContext';
import './LevelMapPage.css';

export interface LevelMapPageProps {
  onBack: () => void;
  onSelectLevel: (levelId: string) => void;
  onCollection: () => void;
  onSandbox: () => void;
}

export function LevelMapPage({
  onBack,
  onSelectLevel,
  onCollection,
  onSandbox,
}: LevelMapPageProps) {
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const { repository, isGuest, ready, session, logout } = useProgress();
  const child = session?.user.role === 'eleve' ? session.user : null;

  useEffect(() => {
    if (!ready) {
      return;
    }

    let active = true;
    setProgress(null);

    const reload = (): void => {
      void repository.getProgress().then((value) => {
        if (active) {
          setProgress(value);
        }
      });
    };

    reload();
    window.addEventListener(PROGRESS_SYNCED_EVENT, reload);

    return () => {
      active = false;
      window.removeEventListener(PROGRESS_SYNCED_EVENT, reload);
    };
  }, [ready, repository]);

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
          <h1>{getText('map.title')}</h1>
          <p>{getText('map.subtitle')}</p>
        </div>

        <ZapCharacter
          expression="content"
          speaking={false}
          className="level-map__zap"
        />
      </header>

      <div className="level-map__toolbar">
        <button
          type="button"
          className="level-map__collection"
          onPointerDown={(event) => activate(event, onCollection)}
        >
          <CollectionIcon />
          <span>{getText('map.collection')}</span>
        </button>

        <button
          type="button"
          className="level-map__collection"
          onPointerDown={(event) => activate(event, onSandbox)}
        >
          <WrenchIcon />
          <span>{getText('map.sandbox')}</span>
        </button>

        {child !== null ? (
          <div className="level-map__child">
            <span className="level-map__avatar" aria-hidden="true">
              {avatarEmoji(child.avatarId)}
            </span>
            <span className="level-map__name">{child.displayName}</span>
            <button
              type="button"
              className="level-map__bye"
              onPointerDown={(event) =>
                activate(event, () => {
                  void logout().then(onBack);
                })
              }
            >
              {getText('map.bye')}
            </button>
          </div>
        ) : null}
      </div>

      {isGuest && ready ? (
        <p className="level-map__guest" role="status">
          {getText('map.guestNotice')}
        </p>
      ) : null}

      {!ready || progress === null ? (
        <div className="level-map__loading" aria-hidden="true" />
      ) : (
        CHAPTERS.map((chapter) => (
          <section
            key={chapter.id}
            className="level-map__chapter"
            data-chapter-id={chapter.id}
          >
            <h2 className="level-map__chapter-title">
              {getText(chapter.titleTextId)}
            </h2>
            <ol className="level-map__path">
              {chapter.levels.map((level) => {
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
          </section>
        ))
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

function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5h7M8 12h7M8 15.5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
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
