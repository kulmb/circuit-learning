import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { WorkbenchPage } from './workbench/WorkbenchPage';
import './App.css';

type Screen = 'home' | 'play' | 'sandbox';

const PLACEHOLDER_TEXT: Record<Exclude<Screen, 'home' | 'play'>, string> = {
  sandbox: 'L’atelier libre arrive bientôt !',
};

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const reduceMotion = useReducedMotion() ?? false;

  if (screen === 'play') {
    return <WorkbenchPage onBack={() => setScreen('home')} />;
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
          <ZapFace />
          <header className="home__header">
            <p className="home__eyebrow">Avec Zap, le petit robot</p>
            <h1 className="home__title">Les Circuits de Zap</h1>
            <p className="home__tagline">Allume les lumières en reliant les bons fils !</p>
          </header>
          <div className="home__actions">
            <button
              type="button"
              className="big-button big-button--primary"
              onPointerDown={(event) => activate(event, () => setScreen('play'))}
            >
              <PlayIcon />
              <span>Jouer</span>
            </button>
            <button
              type="button"
              className="big-button big-button--secondary"
              onPointerDown={(event) => activate(event, () => setScreen('sandbox'))}
            >
              <WrenchIcon />
              <span>Atelier libre</span>
            </button>
          </div>
        </main>
      ) : (
        <main className="placeholder">
          <ZapFace />
          <div className="zap-bubble" role="status">
            <p>{PLACEHOLDER_TEXT[screen]}</p>
          </div>
          <button
            type="button"
            className="big-button big-button--ghost"
            onPointerDown={(event) => activate(event, () => setScreen('home'))}
          >
            <BackIcon />
            <span>Retour</span>
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

function ZapFace() {
  return (
    <svg className="zap-face" viewBox="0 0 140 140" aria-hidden="true" focusable="false">
      <circle cx="70" cy="78" r="46" fill="#8ee3da" opacity="0.35" />
      <line
        x1="70"
        y1="26"
        x2="70"
        y2="14"
        stroke="#2a9d8f"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="70" cy="10" r="7" fill="#ffd166" />
      <rect
        x="28"
        y="26"
        width="84"
        height="76"
        rx="26"
        fill="#c9f7f2"
        stroke="#2a9d8f"
        strokeWidth="6"
      />
      <rect x="46" y="52" width="48" height="34" rx="17" fill="#f7fffe" />
      <circle cx="59" cy="68" r="6" fill="#24324a" />
      <circle cx="81" cy="68" r="6" fill="#24324a" />
      <path
        d="M60 84c4 5 16 5 20 0"
        fill="none"
        stroke="#24324a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="34" cy="92" r="8" fill="#ffb703" />
      <circle cx="106" cy="92" r="8" fill="#ffb703" />
    </svg>
  );
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
