import { useSyncExternalStore } from 'react';

export interface PwaUpdateState {
  ready: boolean;
  apply: () => void;
}

const idleState: PwaUpdateState = {
  ready: false,
  apply: () => undefined,
};

let state: PwaUpdateState = idleState;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function markPwaUpdateReady(apply: () => void): void {
  state = { ready: true, apply };
  emit();
}

export function resetPwaUpdate(): void {
  state = idleState;
  emit();
}

export function applyPwaUpdate(): void {
  state.apply();
}

export function subscribePwaUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaUpdateSnapshot(): PwaUpdateState {
  return state;
}

/**
 * Subscribed only by the level map: a waiting service worker never interrupts
 * a level or the sandbox in progress.
 */
export function usePwaUpdate(): PwaUpdateState {
  return useSyncExternalStore(
    subscribePwaUpdate,
    getPwaUpdateSnapshot,
    getPwaUpdateSnapshot,
  );
}
