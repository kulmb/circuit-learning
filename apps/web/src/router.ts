import { useEffect, useState } from 'react';

const NAVIGATION_EVENT = 'circuits:navigate';

export function currentPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname || '/';
}

export function navigate(path: string, replace = false): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (replace) {
    window.history.replaceState({}, '', path);
  } else if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }

  window.dispatchEvent(new Event(NAVIGATION_EVENT));

  if (import.meta.env.MODE !== 'test') {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      // Very old browsers may not implement scrollTo.
    }
  }
}

export function usePathname(): string {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const update = (): void => setPath(currentPath());

    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATION_EVENT, update);

    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATION_EVENT, update);
    };
  }, []);

  return path;
}

export function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];

    if (expected === undefined || actual === undefined) {
      return null;
    }

    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }

    if (expected !== actual) {
      return null;
    }
  }

  return params;
}
