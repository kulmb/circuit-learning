import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  readPreferences,
  setLowPerformancePreference,
} from '../settings/preferences';
import {
  framesToFps,
  INITIAL_FPS_STATE,
  updateFpsMonitor,
} from './fps';
import './performance.css';

const FPS_WINDOW_MS = 2000;

export interface PerformanceContextValue {
  lowPerformance: boolean;
  manualLow: boolean;
  autoLow: boolean;
  prefersReducedMotion: boolean;
  setLowPerformance: (enabled: boolean) => void;
}

const defaultValue: PerformanceContextValue = {
  lowPerformance: false,
  manualLow: false,
  autoLow: false,
  prefersReducedMotion: false,
  setLowPerformance: () => undefined,
};

const PerformanceContext = createContext<PerformanceContextValue>(defaultValue);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [manualLow, setManualLow] = useState(
    () => readPreferences().lowPerformance,
  );
  const [autoLow, setAutoLow] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => prefersReducedMotionQuery(),
  );
  const autoSuppressedRef = useRef(false);
  const lowPerformance = manualLow || autoLow || prefersReducedMotion;

  useEffect(() => {
    const query = getReducedMotionQuery();
    if (query === null) {
      return;
    }

    const handleChange = (): void => {
      setPrefersReducedMotion(query.matches);
    };

    handleChange();
    query.addEventListener?.('change', handleChange);
    return () => query.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset['performance'] = lowPerformance
      ? 'low'
      : 'normal';
  }, [lowPerformance]);

  useEffect(() => {
    if (
      import.meta.env.MODE === 'test' ||
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      return;
    }

    let frame = 0;
    let frames = 0;
    let windowStart = performance.now();
    let monitor = INITIAL_FPS_STATE;

    const tick = (now: number): void => {
      if (document.hidden) {
        frames = 0;
        windowStart = now;
        frame = window.requestAnimationFrame(tick);
        return;
      }

      frames += 1;
      const elapsed = now - windowStart;

      if (elapsed >= FPS_WINDOW_MS) {
        const next = updateFpsMonitor(
          monitor,
          framesToFps(frames, elapsed),
        );

        if (next.autoLow !== monitor.autoLow) {
          if (!autoSuppressedRef.current) {
            setAutoLow(next.autoLow);
          }
        }

        monitor = next;
        frames = 0;
        windowStart = now;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setLowPerformance = useCallback((enabled: boolean) => {
    setManualLow(enabled);
    setLowPerformancePreference(enabled);

    if (enabled) {
      autoSuppressedRef.current = false;
      return;
    }

    // A parent explicitly asking for full effects wins over the automatic
    // detector until the next page load.
    autoSuppressedRef.current = true;
    setAutoLow(false);
  }, []);

  return (
    <PerformanceContext.Provider
      value={{
        lowPerformance,
        manualLow,
        autoLow,
        prefersReducedMotion,
        setLowPerformance,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance(): PerformanceContextValue {
  return useContext(PerformanceContext);
}

function getReducedMotionQuery(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

function prefersReducedMotionQuery(): boolean {
  return getReducedMotionQuery()?.matches ?? false;
}
