import {
  createComponent,
  createWire,
  simulateCircuit,
  starsForHints,
  type LevelDefinition,
  type MaterialCardDefinition,
  type MaterialVisualKind,
} from '@circuits/shared';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Zap } from '../components/Zap';
import { getText } from '../narration/fr';
import type { ZapExpression } from '../narration/hints';
import { unlockNarration } from '../narration/narrationService';
import { useNarration } from '../narration/useNarration';
import { playSuccessFanfare, unlockAudio } from '../workbench/audio';
import { LevelSuccessOverlay } from './LevelSuccessOverlay';
import { useLevelSession } from './useLevelSession';
import './LevelPage.css';
import './MaterialsLevelPage.css';

type Placement = 'tray' | 'slot' | 'conductive' | 'insulating';
type DropZone = 'slot' | 'tray' | 'conductive' | 'insulating';

interface DragState {
  cardId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  pointerType: string;
  moved: boolean;
}

export interface MaterialsLevelPageProps {
  level: LevelDefinition;
  onBack: () => void;
  onNextLevel?: () => void;
}

export function MaterialsLevelPage({
  level,
  onBack,
  onNextLevel,
}: MaterialsLevelPageProps) {
  const challenge = level.materialsChallenge;
  const cards = challenge?.cards ?? [];
  const narration = useNarration();
  const session = useLevelSession(level);
  const [placements, setPlacements] = useState<Record<string, Placement>>(() =>
    Object.fromEntries(cards.map((card) => [card.id, 'tray'])),
  );
  const [hintIndex, setHintIndex] = useState(0);
  const [expression, setExpression] = useState<ZapExpression>('content');
  const [completionStars, setCompletionStars] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredZone, setHoveredZone] = useState<DropZone | null>(null);
  const completedRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const conductiveBinRef = useRef<HTMLDivElement>(null);
  const insulatingBinRef = useRef<HTMLDivElement>(null);

  const slotCard = cards.find((card) => placements[card.id] === 'slot');
  const trayCards = cards.filter((card) => placements[card.id] === 'tray');
  const conductiveCards = cards.filter(
    (card) => placements[card.id] === 'conductive',
  );
  const insulatingCards = cards.filter(
    (card) => placements[card.id] === 'insulating',
  );

  const demoSimulation = useMemo(() => {
    const battery = createComponent('battery', { id: 'demo-battery' });
    const bulb = createComponent('bulb', { id: 'demo-bulb' });
    const material = createComponent('material', {
      id: 'demo-material',
      conductive: slotCard?.conductive ?? false,
    });

    return simulateCircuit({
      components: [battery, bulb, material],
      wires: [
        createWire(
          'demo-wire-1',
          { componentId: 'demo-battery', terminalId: 'positive' },
          { componentId: 'demo-bulb', terminalId: 'a' },
        ),
        createWire(
          'demo-wire-2',
          { componentId: 'demo-bulb', terminalId: 'b' },
          { componentId: 'demo-material', terminalId: 'a' },
        ),
        createWire(
          'demo-wire-3',
          { componentId: 'demo-material', terminalId: 'b' },
          { componentId: 'demo-battery', terminalId: 'negative' },
        ),
      ],
    });
  }, [slotCard]);

  const bulbOn = demoSimulation.states['demo-bulb']?.state !== 'off';
  const allSorted =
    cards.length > 0 &&
    cards.every(
      (card) =>
        placements[card.id] === (card.conductive ? 'conductive' : 'insulating'),
    );

  useEffect(() => {
    narration.say(level.introTextId);
  }, [level, narration.say]);

  useEffect(() => {
    if (!allSorted || completedRef.current) {
      return;
    }

    completedRef.current = true;
    setSaveError(false);
    playSuccessFanfare();
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
    allSorted,
    level.id,
    narration.say,
    session.completeSuccess,
    session.hintsUsed,
  ]);

  function placeCard(cardId: string, zone: Placement): void {
    setPlacements((previous) => {
      const next = { ...previous };

      if (zone === 'slot') {
        for (const [id, placement] of Object.entries(next)) {
          if (placement === 'slot') {
            next[id] = 'tray';
          }
        }
      }

      next[cardId] = zone;
      return next;
    });
    setHintIndex(0);
  }

  function requestHint(): void {
    unlockNarration();
    unlockAudio();
    session.recordHint();

    const maxIndex = Math.max(0, level.hintTextIds.length - 1);
    const index = Math.min(hintIndex, maxIndex);
    const textId = level.hintTextIds[index] ?? 'level.04.hint.1';

    setHintIndex(Math.min(index + 1, maxIndex));
    setExpression(index >= 2 ? 'surprised' : 'thinking');
    narration.say(textId);
  }

  function handleCardPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    card: MaterialCardDefinition,
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
      cardId: card.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      pointerType: event.pointerType,
      moved: false,
    });
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

    setDrag({
      ...drag,
      x: event.clientX,
      y: event.clientY,
      moved,
    });
    setHoveredZone(moved ? findDropZone(event.clientX, event.clientY) : null);
  }

  function handleCardPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }

    const zone = findDropZone(event.clientX, event.clientY);
    if (zone !== null) {
      placeCard(drag.cardId, zone);
    }

    activePointerRef.current = null;
    setDrag(null);
    setHoveredZone(null);
  }

  function handleCardPointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    activePointerRef.current = null;
    setDrag(null);
    setHoveredZone(null);
  }

  function findDropZone(clientX: number, clientY: number): DropZone | null {
    const zones: Array<[DropZone, HTMLDivElement | null]> = [
      ['slot', slotRef.current],
      ['conductive', conductiveBinRef.current],
      ['insulating', insulatingBinRef.current],
      ['tray', trayRef.current],
    ];

    for (const [zone, element] of zones) {
      if (element === null) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return zone;
      }
    }

    return null;
  }

  const draggedCard =
    drag === null ? undefined : cards.find((card) => card.id === drag.cardId);
  const ghostOffset = drag?.pointerType === 'touch' ? 40 : 0;

  if (challenge === undefined) {
    return (
      <div className="materials-page">
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
    <div className="materials-page">
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

      <p className="materials-instructions">
        {getText('materials.instructions')}
      </p>

      <section className="materials-circuit" aria-label={getText(level.goalTextId)}>
        <MiniBattery />
        <span className={`materials-wire${bulbOn ? ' is-on' : ''}`} aria-hidden="true" />

        <div
          ref={slotRef}
          className={`materials-slot${hoveredZone === 'slot' ? ' is-hovered' : ''}`}
          data-zone="slot"
        >
          {slotCard === undefined ? (
            <span className="materials-slot__empty">
              {getText('materials.gap')}
            </span>
          ) : (
            <MaterialCard
              card={slotCard}
              compact
              dragging={drag?.cardId === slotCard.id && drag.moved}
              onPointerDown={handleCardPointerDown}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerCancel}
            />
          )}
        </div>

        <span className={`materials-wire${bulbOn ? ' is-on' : ''}`} aria-hidden="true" />
        <MiniBulb on={bulbOn} />
      </section>

      <section
        ref={trayRef}
        className={`materials-tray${hoveredZone === 'tray' ? ' is-hovered' : ''}`}
        data-zone="tray"
      >
        <h2>{getText('materials.tray')}</h2>
        <div className="materials-tray__cards">
          {trayCards.map((card) => (
            <MaterialCard
              key={card.id}
              card={card}
              dragging={drag?.cardId === card.id && drag.moved}
              onPointerDown={handleCardPointerDown}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerCancel}
            />
          ))}
          {trayCards.length === 0 ? (
            <span className="materials-tray__empty" aria-hidden="true">
              ✓
            </span>
          ) : null}
        </div>
      </section>

      <section className="materials-bins">
        <div
          ref={conductiveBinRef}
          className={`material-bin material-bin--conductive${hoveredZone === 'conductive' ? ' is-hovered' : ''}`}
          data-zone="conductive"
        >
          <h2>{getText(challenge.conductiveBinTextId)}</h2>
          <div className="material-bin__cards">
            {conductiveCards.map((card) => (
              <MaterialCard
                key={card.id}
                card={card}
                compact
                dragging={drag?.cardId === card.id && drag.moved}
                onPointerDown={handleCardPointerDown}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerCancel}
              />
            ))}
          </div>
        </div>

        <div
          ref={insulatingBinRef}
          className={`material-bin material-bin--insulating${hoveredZone === 'insulating' ? ' is-hovered' : ''}`}
          data-zone="insulating"
        >
          <h2>{getText(challenge.insulatingBinTextId)}</h2>
          <div className="material-bin__cards">
            {insulatingCards.map((card) => (
              <MaterialCard
                key={card.id}
                card={card}
                compact
                dragging={drag?.cardId === card.id && drag.moved}
                onPointerDown={handleCardPointerDown}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerCancel}
              />
            ))}
          </div>
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

      {drag !== null && drag.moved && draggedCard !== undefined ? (
        <div
          className="material-drag-ghost"
          aria-hidden="true"
          style={{
            left: drag.x,
            top: drag.y - ghostOffset,
          }}
        >
          <MaterialCard
            card={draggedCard}
            dragging={false}
            onPointerDown={() => undefined}
            onPointerMove={() => undefined}
            onPointerUp={() => undefined}
            onPointerCancel={() => undefined}
          />
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

interface MaterialCardProps {
  card: MaterialCardDefinition;
  compact?: boolean;
  dragging: boolean;
  onPointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    card: MaterialCardDefinition,
  ) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

function MaterialCard({
  card,
  compact = false,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: MaterialCardProps) {
  return (
    <button
      type="button"
      className={`material-card${compact ? ' material-card--compact' : ''}${dragging ? ' is-dragging' : ''}`}
      data-material-id={card.id}
      onPointerDown={(event) => onPointerDown(event, card)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <MaterialIcon visual={card.visual} />
      <span>{getText(card.labelTextId)}</span>
    </button>
  );
}

export function MaterialIcon({ visual }: { visual: MaterialVisualKind }) {
  if (visual === 'metal') {
    return (
      <svg className="material-icon" viewBox="0 0 64 48" aria-hidden="true">
        <circle cx="20" cy="22" r="10" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2.5" />
        <circle cx="20" cy="22" r="4" fill="#90a4ae" />
        <rect x="29" y="19" width="26" height="6" rx="3" fill="#b0bec5" stroke="#607d8b" strokeWidth="2" />
        <rect x="45" y="25" width="5" height="8" fill="#b0bec5" stroke="#607d8b" strokeWidth="1.5" />
        <rect x="51" y="25" width="5" height="11" fill="#b0bec5" stroke="#607d8b" strokeWidth="1.5" />
      </svg>
    );
  }

  if (visual === 'gum') {
    return (
      <svg className="material-icon" viewBox="0 0 64 48" aria-hidden="true">
        <rect x="10" y="10" width="44" height="28" rx="7" fill="#a5d6a7" stroke="#2e7d32" strokeWidth="2.5" />
        <rect x="25" y="10" width="14" height="28" fill="#f9a8d4" />
      </svg>
    );
  }

  if (visual === 'spoon') {
    return (
      <svg className="material-icon" viewBox="0 0 64 48" aria-hidden="true">
        <ellipse cx="22" cy="24" rx="12" ry="10" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2.5" />
        <rect x="32" y="21" width="24" height="6" rx="3" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2.5" />
      </svg>
    );
  }

  if (visual === 'pencil') {
    return (
      <svg className="material-icon" viewBox="0 0 64 48" aria-hidden="true">
        <rect x="8" y="19" width="34" height="10" rx="2" fill="#f4c542" stroke="#a16207" strokeWidth="2" />
        <path d="M42 19l10 5-10 5z" fill="#e7c9a9" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
        <path d="M49 23l3 1.5-3 1.5z" fill="#24324a" />
        <rect x="8" y="19" width="7" height="10" fill="#f9a8d4" />
      </svg>
    );
  }

  return (
    <svg className="material-icon" viewBox="0 0 64 48" aria-hidden="true">
      <path
        d="M6 28q6-14 14-6t12-4 12 8 14-6v18q-8 8-16 0t-14 2-12-6-10 2z"
        fill="#dbe4ea"
        stroke="#78909c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniBattery() {
  return (
    <svg className="mini-battery" viewBox="0 0 120 80" aria-hidden="true">
      <rect x="18" y="24" width="78" height="34" rx="10" fill="#f4a261" stroke="#b45309" strokeWidth="3" />
      <rect x="12" y="32" width="9" height="18" rx="4" fill="#d97706" />
      <text x="42" y="43" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="900" fill="#3b2a1a">+</text>
      <text x="74" y="43" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="900" fill="#3b2a1a">−</text>
    </svg>
  );
}

function MiniBulb({ on }: { on: boolean }) {
  return (
    <svg className="mini-bulb" viewBox="0 0 120 100" aria-hidden="true">
      {on ? <circle cx="60" cy="42" r="34" fill="#ffd166" opacity="0.35" /> : null}
      <path d="M38 68l4-8M82 68l-4-8" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="42" r="24" fill={on ? '#ffe8a3' : '#e2e8f0'} stroke="#94a3b8" strokeWidth="3" />
      <path d="M49 49l5-13 6 13 6-13 5 13" fill="none" stroke={on ? '#fff7c2' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="50" y="66" width="20" height="16" rx="4" fill="#64748b" />
    </svg>
  );
}
