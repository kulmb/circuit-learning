import {
  authSessionResponseSchema,
  type AuthSessionResponse,
  type ProgressRepository,
} from '@circuits/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { API_BASE_URL } from '../config';
import {
  ApiProgressRepository,
  PROGRESS_SYNCED_EVENT,
} from './ApiProgressRepository';
import {
  localProgressRepository,
} from './LocalProgressRepository';
import { mergeGuestProgressIntoApi } from './mergeGuestProgress';

export interface MergePromptState {
  open: boolean;
  busy: boolean;
  error: boolean;
}

export interface ProgressContextValue {
  repository: ProgressRepository;
  session: AuthSessionResponse | null;
  ready: boolean;
  isGuest: boolean;
  setSession: (session: AuthSessionResponse | null) => void;
  logout: () => Promise<void>;
  mergePrompt: MergePromptState;
  mergeGuestProgress: () => Promise<void>;
  keepAccountOnly: () => void;
}

const CLOSED_MERGE_PROMPT: MergePromptState = {
  open: false,
  busy: false,
  error: false,
};

const ProgressContext = createContext<ProgressContextValue>({
  repository: localProgressRepository,
  session: null,
  ready: true,
  isGuest: true,
  setSession: () => undefined,
  logout: async () => undefined,
  mergePrompt: CLOSED_MERGE_PROMPT,
  mergeGuestProgress: async () => undefined,
  keepAccountOnly: () => undefined,
});

const SIGNED_OUT_KEY = 'circuits-de-zap:signed-out';

/**
 * A failed offline logout must not let a page reload restore the previous
 * child. This local marker survives until an explicit login succeeds.
 */
function readSignedOut(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function markSignedOut(): void {
  try {
    window.localStorage.setItem(SIGNED_OUT_KEY, '1');
  } catch {
    // Without storage the cookie still expires on its own.
  }
}

function clearSignedOut(): void {
  try {
    window.localStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // Ignore.
  }
}

function declineKey(userId: string): string {
  return `circuits-de-zap:merge-declined:${userId}`;
}

function readDecline(userId: string): string | null {
  try {
    return window.localStorage.getItem(declineKey(userId));
  } catch {
    return null;
  }
}

function writeDecline(userId: string, fingerprint: string): void {
  try {
    window.localStorage.setItem(declineKey(userId), fingerprint);
  } catch {
    // The question may reappear; never block the game for storage.
  }
}

function clearDecline(userId: string): void {
  try {
    window.localStorage.removeItem(declineKey(userId));
  } catch {
    // Ignore.
  }
}

export interface ProgressProviderProps {
  children: ReactNode;
  initialSession?: AuthSessionResponse | null;
  autoLoad?: boolean;
}

export function ProgressProvider({
  children,
  initialSession = null,
  autoLoad = true,
}: ProgressProviderProps) {
  const [session, setSessionState] = useState<AuthSessionResponse | null>(
    initialSession,
  );
  const [ready, setReady] = useState(false);
  const [mergePrompt, setMergePrompt] =
    useState<MergePromptState>(CLOSED_MERGE_PROMPT);
  const shouldCheckGuestProgress = useCallback(
    (next: AuthSessionResponse | null): boolean => {
      if (next === null || next.user.role !== 'eleve') {
        return false;
      }

      if (!localProgressRepository.hasGuestProgress()) {
        return false;
      }

      return (
        readDecline(next.user.id) !==
        localProgressRepository.guestFingerprint()
      );
    },
    [],
  );
  const applySession = useCallback(
    (next: AuthSessionResponse | null) => {
      if (next !== null) {
        clearSignedOut();
      }

      setSessionState(next);

      if (shouldCheckGuestProgress(next)) {
        setMergePrompt({ open: true, busy: false, error: false });
      } else {
        setMergePrompt(CLOSED_MERGE_PROMPT);
      }
    },
    [shouldCheckGuestProgress],
  );

  useEffect(() => {
    if (!autoLoad) {
      setReady(true);
      return;
    }

    if (import.meta.env.MODE === 'test') {
      setReady(true);
      return;
    }

    if (readSignedOut()) {
      setReady(true);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);

    void fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!active || !response.ok) {
          return;
        }

        const parsed = authSessionResponseSchema.safeParse(
          await response.json(),
        );

        if (parsed.success) {
          applySession(parsed.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeout);

        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [applySession, autoLoad]);

  useEffect(() => {
    if (initialSession !== null) {
      clearSignedOut();

      if (shouldCheckGuestProgress(initialSession)) {
        setMergePrompt({ open: true, busy: false, error: false });
      }
      setReady(true);
    }
  }, [initialSession, shouldCheckGuestProgress]);

  const repository = useMemo<ProgressRepository>(() => {
    if (session !== null && session.user.role === 'eleve') {
      return new ApiProgressRepository({ userId: session.user.id });
    }

    return localProgressRepository;
  }, [session]);

  useEffect(() => {
    if (!(repository instanceof ApiProgressRepository)) {
      return;
    }

    return repository.startSync();
  }, [repository]);

  const mergeGuestProgress = useCallback(async () => {
    if (!(repository instanceof ApiProgressRepository) || session === null) {
      return;
    }

    setMergePrompt({ open: true, busy: true, error: false });

    try {
      await mergeGuestProgressIntoApi(repository);
      localProgressRepository.clearGuestData();
      clearDecline(session.user.id);
      await repository.flushQueue();
      setMergePrompt(CLOSED_MERGE_PROMPT);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROGRESS_SYNCED_EVENT));
      }
    } catch {
      setMergePrompt({ open: true, busy: false, error: true });
    }
  }, [repository, session]);

  const keepAccountOnly = useCallback(() => {
    if (session !== null) {
      writeDecline(
        session.user.id,
        localProgressRepository.guestFingerprint(),
      );
    }

    setMergePrompt(CLOSED_MERGE_PROMPT);
  }, [session]);

  const logout = useCallback(async () => {
    // Mark first: even if the network call fails, a reload must not restore
    // the previous session from the still-valid httpOnly cookie.
    markSignedOut();

    if (repository instanceof ApiProgressRepository) {
      repository.clearUserCache();
    }

    setSessionState(null);
    setMergePrompt(CLOSED_MERGE_PROMPT);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        signal: controller.signal,
      });
    } catch {
      // The local marker keeps the session from coming back on reload. The
      // server cookie still expires on its own; a later login replaces it.
    } finally {
      clearTimeout(timeout);
    }
  }, [repository]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      repository,
      session,
      ready,
      isGuest: session === null,
      setSession: applySession,
      logout,
      mergePrompt,
      mergeGuestProgress,
      keepAccountOnly,
    }),
    [
      applySession,
      keepAccountOnly,
      logout,
      mergeGuestProgress,
      mergePrompt,
      ready,
      repository,
      session,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  return useContext(ProgressContext);
}

export function useProgressRepository(): ProgressRepository {
  return useProgress().repository;
}
