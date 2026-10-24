import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';

import { ZapCharacter } from './components/Zap';
import type { AppScreen } from './GameShell';
import { LayoutProvider } from './layout/LayoutContext';
import { fr, getText } from './narration/fr';
import { unlockNarration } from './narration/narrationService';
import {
  PerformanceProvider,
  usePerformance,
} from './performance/PerformanceContext';
import { GuestMergeDialog } from './progress/GuestMergeDialog';
import {
  ProgressProvider,
  useProgress,
} from './progress/ProgressContext';
import { PwaUpdateNotice } from './pwa/PwaUpdateNotice';
import { navigate, usePathname } from './router';
import { APP_VERSION, rememberAppVersion } from './version';
import { unlockAudio } from './workbench/audio';
import './App.css';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const GameShell = lazy(() => import('./GameShell'));
const ParentSettingsPage = lazy(
  () => import('./settings/ParentSettingsPage'),
);

export function App() {
  useEffect(() => {
    rememberAppVersion();
  }, []);

  return (
    <LayoutProvider>
      <PerformanceProvider>
        <PerformanceShell />
      </PerformanceProvider>
    </LayoutProvider>
  );
}

function PerformanceShell() {
  const { lowPerformance } = usePerformance();

  return (
    <MotionConfig reducedMotion={lowPerformance ? 'always' : 'user'}>
      <ProgressProvider>
        <RootRoutes />
        <PwaUpdateNotice />
      </ProgressProvider>
    </MotionConfig>
  );
}

function RouteLoading() {
  return (
    <main className="route-loading" aria-busy="true">
      <div className="route-loading__spinner" aria-hidden="true" />
    </main>
  );
}

function RootRoutes() {
  const path = usePathname();
  const adminRoute =
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path.startsWith('/invitation/');

  if (path === '/parents') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <ParentSettingsPage onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (adminRoute) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <>
      <AppContent />
      <GuestMergeDialog />
    </>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [levelId, setLevelId] = useState<string | null>(null);
  const { session } = useProgress();
  const reduceMotion = useReducedMotion() ?? false;
  const child = session?.user.role === 'eleve' ? session.user : null;

  function openSandbox(): void {
    unlockNarration();
    unlockAudio();
    setScreen('sandbox');
  }

  if (screen !== 'home') {
    return (
      <Suspense fallback={<RouteLoading />}>
        <GameShell
          screen={screen}
          levelId={levelId}
          onNavigate={(next, nextLevelId) => {
            setScreen(next);
            if (nextLevelId !== undefined) {
              setLevelId(nextLevelId);
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <motion.div
      className="app-shell"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
    >
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
                setScreen(child === null ? 'login' : 'map');
              })
            }
          >
            <PlayIcon />
            <span>{fr.home.play}</span>
          </button>
          <button
            type="button"
            className="big-button big-button--secondary"
            onPointerDown={(event) =>
              activate(event, openSandbox)
            }
          >
            <WrenchIcon />
            <span>{fr.home.sandbox}</span>
          </button>
        </div>

        <div className="home__links">
          <button
            type="button"
            className="home__adult"
            onPointerDown={(event) =>
              activate(event, () => navigate('/admin'))
            }
          >
            {getText('home.adultSpace')}
          </button>
          <button
            type="button"
            className="home__adult"
            onPointerDown={(event) =>
              activate(event, () => navigate('/parents'))
            }
          >
            {getText('home.parentSettings')}
          </button>
        </div>
        <p className="home__version" aria-label={`Version ${APP_VERSION}`}>
          Version {APP_VERSION}
        </p>
      </main>
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
