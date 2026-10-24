import {
  createComponent,
  starsForHints,
  type ComponentType,
  type MatchingPairDefinition,
} from '@circuits/shared';
import type { LevelDefinition } from '@circuits/shared/levels';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Zap } from '../components/Zap';
import { RealisticArt, SymbolArt } from '../workbench/ComponentArt';
import { getText } from '../narration/fr';
import type { ZapExpression } from '../narration/hints';
import { unlockNarration } from '../narration/narrationService';
import { useNarration } from '../narration/useNarration';
import { vibrateSuccess } from '../feedback/haptics';
import { playSuccessFanfare, unlockAudio } from '../workbench/audio';
import { LevelSuccessOverlay } from './LevelSuccessOverlay';
import { useLevelSession } from './useLevelSession';
import './LevelPage.css';
import './SymbolMatchingPage.css';

interface MatchingDrag {
  pairId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  pointerType: string;
  moved: boolean;
}

export interface SymbolMatchingPageProps {
  level: LevelDefinition;
  onBack: () => void;
  onNextLevel?: () => void;
}

export function SymbolMatchingPage({
  level,
  onBack,
  onNextLevel,
}: SymbolMatchingPageProps) {
  const challenge = level.matchingChallenge;
  const pairs = challenge?.pairs ?? [];
  const narration = useNarration();
  const session = useLevelSession(level);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [drag, setDrag] = useState<MatchingDrag | null>(null);
  const [wrongPairId, setWrongPairId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [expression, setExpression] = useState<ZapExpression>('content');
  const [completionStars, setCompletionStars] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const completedRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const targetRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const wrongTimerRef = useRef<number | null>(null);

  const trayPairs = useMemo(
    () => [...pairs].sort((left, right) => left.id.localeCompare(right.id)),
    [pairs],
  );
  const allMatched = pairs.length > 0 && matched.size === pairs.length;

  useEffect(() => {
    narration.say(level.introTextId);
  }, [level, narration.say]);

  useEffect(
    () => () => {
      if (wrongTimerRef.current !== null) {
        window.clearTimeout(wrongTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!allMatched || completedRef.current) {
      return;
    }

    completedRef.current = true;
    setSaveError(false);
    playSuccessFanfare();
    vibrateSuccess();
    setExpression('content');
    narration.say('zap.successGeneric');
    const fallbackStars = starsForHints(session.hintsUsed);

    void session
      .completeSuccess()
      .then((progress) => {
        if (progress === null) {
          setSaveError(true);
          narration.say('progress.saveError');
        }
        setCompletionStars(
          progress?.levels[level.id]?.stars ?? fallbackStars,
        );
      })
      .catch(() => {
        setSaveError(true);
        narration.say('progress.saveError');
        setCompletionStars(fallbackStars);
      });
  }, [
    allMatched,
    level.id,
    narration.say,
    session.completeSuccess,
    session.hintsUsed,
  ]);

  function markWrong(pairId: string): void {
    setWrongPairId(pairId);
    setExpression('surprised');
    narration.say('symbols.wrong');

    if (wrongTimerRef.current !== null) {
      window.clearTimeout(wrongTimerRef.current);
    }

    wrongTimerRef.current = window.setTimeout(() => {
      setWrongPairId(null);
      wrongTimerRef.current = null;
    }, 450);
  }

  function matchPair(pairId: string): void {
    setMatched((previous) => {
      const next = new Set(previous);
      next.add(pairId);
      return next;
    });
    setSelectedPairId(null);
    setWrongPairId(null);
    setHintIndex(0);
    setExpression('content');
  }

  function tryMatch(pairId: string): void {
    if (selectedPairId === null) {
      return;
    }

    if (selectedPairId === pairId) {
      matchPair(pairId);
    } else {
      markWrong(pairId);
      setSelectedPairId(null);
    }
  }

  function requestHint(): void {
    unlockNarration();
    unlockAudio();
    session.recordHint();

    const maxIndex = Math.max(0, level.hintTextIds.length - 1);
    const index = Math.min(hintIndex, maxIndex);
    const textId = level.hintTextIds[index] ?? 'symbols.hint.1';

    setHintIndex(Math.min(index + 1, maxIndex));
    setExpression(index >= 2 ? 'surprised' : 'thinking');
    narration.say(textId);
  }

  function handleCardPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    pair: MatchingPairDefinition,
  ): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (activePointerRef.current !== null) {
      return;
    }

    event.preventDefault();
    unlockAudio();
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pairId: pair.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType,
      moved: false,
    });
    setSelectedPairId(pair.id);
  }

  function handleCardPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    const moved =
      drag.moved ||
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8;

    setDrag({ ...drag, x: event.clientX, y: event.clientY, moved });
  }

  function handleCardPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    if (drag.moved) {
      const targetId = findTarget(event.clientX, event.clientY);

      if (targetId !== null) {
        if (targetId === drag.pairId) {
          matchPair(targetId);
        } else {
          markWrong(targetId);
        }
      }
    }

    activePointerRef.current = null;
    setDrag(null);
  }

  function handleCardPointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    activePointerRef.current = null;
    setDrag(null);
  }

  function findTarget(clientX: number, clientY: number): string | null {
    for (const [pairId, element] of targetRefs.current) {
      const rect = element.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return pairId;
      }
    }

    return null;
  }

  const draggedPair =
    drag === null ? undefined : pairs.find((pair) => pair.id === drag.pairId);
  const ghostOffset = drag?.pointerType === 'touch' ? 40 : 0;
  const unmatchedPairs = trayPairs.filter((pair) => !matched.has(pair.id));

  if (challenge === undefined) {
    return (
      <div className="matching-page">
        <button
          type="button"
          className="level-back-button"
          onPointerDown={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          ← {getText('map.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="matching-page">
      <header className="level-header">
        <button
          type="button"
          className="level-back-button"
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
              return;
            }
            event.preventDefault();
            onBack();
          }}
        >
          <span aria-hidden="true">←</span>
          <span>{getText('map.back')}</span>
        </button>

        <div className="level-header__heading">
          <h1>{getText(level.titleTextId)}</h1>
          <p>{getText(level.goalTextId)}</p>
        </div>
      </header>

      <p className="matching-instructions">
        {getText('symbols.instructions')}
      </p>

      <section className="matching-targets" aria-label={getText('symbols.symbol')}>
        {pairs.map((pair, index) => {
          const isMatched = matched.has(pair.id);
          const isWrong = wrongPairId === pair.id;

          return (
            <button
              key={pair.id}
              type="button"
              ref={(element) => {
                if (element === null) {
                  targetRefs.current.delete(pair.id);
                } else {
                  targetRefs.current.set(pair.id, element);
                }
              }}
              className={`matching-target${isMatched ? ' is-matched' : ''}${isWrong ? ' is-wrong' : ''}${selectedPairId !== null && !isMatched ? ' is-ready' : ''}`}
              data-match-target={pair.id}
              disabled={isMatched}
              aria-label={`${getText('symbols.symbol')} ${index + 1}`}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) {
                  return;
                }
                event.preventDefault();
                tryMatch(pair.id);
              }}
            >
              <PairPreview type={pair.type} mode="symbol" />
              {isMatched ? (
                <span className="matching-target__check" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </section>

      <section className="matching-tray" aria-label={getText('symbols.component')}>
        <div className="matching-cards">
          {unmatchedPairs.map((pair) => (
            <button
              key={pair.id}
              type="button"
              className={`matching-card${selectedPairId === pair.id ? ' is-selected' : ''}${drag?.pairId === pair.id && drag.moved ? ' is-dragging' : ''}`}
              data-match-card={pair.id}
              onPointerDown={(event) => handleCardPointerDown(event, pair)}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerCancel}
            >
              <PairPreview type={pair.type} mode="realistic" />
              <span>{getText(pair.labelTextId)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="level-zap">
        <Zap
          expression={expression}
          message={narration.text}
          speaking={narration.speaking}
          muted={narration.muted}
          onHint={requestHint}
          onReplay={narration.replay}
          onToggleMute={narration.toggleMute}
        />
      </div>

      {drag !== null && drag.moved && draggedPair !== undefined ? (
        <div
          className="matching-drag-ghost"
          aria-hidden="true"
          style={{ left: drag.x, top: drag.y - ghostOffset }}
        >
          <PairPreview type={draggedPair.type} mode="realistic" />
          <span>{getText(draggedPair.labelTextId)}</span>
        </div>
      ) : null}

      {completionStars !== null ? (
        <LevelSuccessOverlay
          level={level}
          stars={completionStars}
          hasNext={level.nextLevelId !== null}
          saveError={saveError}
          onNext={onNextLevel ?? onBack}
          onMap={onBack}
        />
      ) : null}
    </div>
  );
}

function PairPreview({
  type,
  mode,
}: {
  type: ComponentType;
  mode: 'realistic' | 'symbol';
}) {
  const component = useMemo(
    () => createComponent(type, { id: `matching-${type}` }),
    [type],
  );

  return (
    <svg
      className={`matching-preview matching-preview--${mode}`}
      viewBox="-50 -30 100 60"
      aria-hidden="true"
    >
      {mode === 'realistic' ? (
        <RealisticArt component={component} state={undefined} short={false} />
      ) : (
        <SymbolArt component={component} state={undefined} short={false} />
      )}
    </svg>
  );
}
