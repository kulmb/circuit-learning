import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getLayoutMode, type LayoutMode } from './layoutMode';

const FALLBACK_MODE = getLayoutMode(1280, 800);

export const LayoutContext = createContext<LayoutMode>(FALLBACK_MODE);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const probeRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return FALLBACK_MODE;
    }

    return getLayoutMode(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const probe = probeRef.current;

    function update(): void {
      const rect = probe?.getBoundingClientRect();
      const width =
        rect !== undefined && rect.width > 0 ? rect.width : window.innerWidth;
      const height =
        rect !== undefined && rect.height > 0 ? rect.height : window.innerHeight;

      setMode((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : getLayoutMode(width, height),
      );
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);

    let observer: ResizeObserver | null = null;
    if (probe !== null && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(probe);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return (
    <LayoutContext.Provider value={mode}>
      <div
        className="app-root"
        data-layout={mode.size}
        data-orientation={mode.orientation}
      >
        {children}
        <div ref={probeRef} className="layout-probe" aria-hidden="true" />
      </div>
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutMode {
  return useContext(LayoutContext);
}
