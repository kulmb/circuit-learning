import { getLevelById } from '@circuits/shared';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { ZapCharacter } from './components/Zap';
import { LayoutProvider } from './layout/LayoutContext';
import { LevelMapPage } from './levels/LevelMapPage';
import { MaterialsLevelPage } from './levels/MaterialsLevelPage';
import { SymbolMatchingPage } from './levels/SymbolMatchingPage';
import { fr } from './narration/fr';
import { unlockNarration } from './narration/narrationService';
import { GuestMergeDialog } from './progress/GuestMergeDialog';
import { ProgressProvider } from './progress/ProgressContext';
import { WorkbenchPage } from './workbench/WorkbenchPage';
import './App.css';

type Screen = 'home' | 'map' | 'play' | 'sandbox';

export function App() {
  return (
    <LayoutProvider>
      <ProgressProvider>
        <AppContent />
        <GuestMergeDialog />
      </ProgressProvider>
    </LayoutProvider>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('home');
  const [levelId, setLevelId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const level = levelId === null ? undefined : getLevelById(levelId);

  if (screen === 'map') {
    return (
      <LevelMapPage
        onBack={() => setScreen('home')}
        onSelectLevel={(selectedLevelId) => {
          setLevelId(selectedLevelId);
          setScreen('play');
        }}
      />
    );
  }

  if (screen === 'play') {
    if (level === undefined) {
      return (
        <LevelMapPage
          onBack={() => setScreen('home')}
          onSelectLevel={(selectedLevelId) => {
            setLevelId(selectedLevelId);
            setScreen('play');
          }}
        />
      );
    }

    const nextLevelProps =
      level.nextLevelId === null
        ? {}
        : {
            onNextLevel: () => {
              setLevelId(level.nextLevelId);
            },
          };

    if (level.kind === 'materials') {
      return (
        <MaterialsLevelPage
          key={level.id}
          level={level}
          onBack={() => setScreen('map')}
          {...nextLevelProps}
        />
      );
    }

    if (level.kind === 'matching') {
      return (
        <SymbolMatchingPage
          key={level.id}
          level={level}
          onBack={() => setScreen('map')}
          {...nextLevelProps}
        />
      );
    }

    return (
      <WorkbenchPage
        key={level.id}
        level={level}
        onBack={() => setScreen('map')}
        {...nextLevelProps}
      />
    );
  }

  return (
    <motion.div
      className="app-shell"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
    >
      {screen === 'home' ? (
        <main className="home">
          <ZapCharacter expression="content" speaking={false} className="zap-face" />
          <header className="home__header">
            <p className="home__eyebrow">{fr.home.eyebrow}</p>
            <h1 className="home__title">{fr.home.title}</h1>
            <p className="home__tagline">{fr.home.tagline}</p>
          </header>
          <div className="home__actions">
            <button
              type="button"
              className="big-button big-button--primary"
              onPointerDown={(event) =>
                activate(event, () => {
                  unlockNarration();
                  setScreen('map');
                })
              }
            >
              <PlayIcon />
              <span>{fr.home.play}</span>
            </button>
            <button
              type="button"
              className="big-button big-button--secondary"
              onPointerDown={(event) => activate(event, () => setScreen('sandbox'))}
            >
              <WrenchIcon />
              <span>{fr.home.sandbox}</span>
            </button>
          </div>
        </main>
      ) : (
        <main className="placeholder">
          <ZapCharacter expression="content" speaking={false} className="zap-face" />
          <div className="home-bubble" role="status">
            <p>{fr.home.sandboxPlaceholder}</p>
          </div>
          <button
            type="button"
            className="big-button big-button--ghost"
            onPointerDown={(event) => activate(event, () => setScreen('home'))}
          >
            <BackIcon />
            <span>{fr.home.back}</span>
          </button>
        </main>
      )}
    </motion.div>
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

function PlayIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg
      className="button-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      className="button-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
