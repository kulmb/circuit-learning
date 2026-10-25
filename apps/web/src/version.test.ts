import { beforeEach, describe, expect, it } from 'vitest';

import {
  APP_VERSION,
  APP_VERSION_STORAGE_KEY,
  readStoredAppVersion,
  rememberAppVersion,
} from './version';

describe('application version', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exposes the 0.3.0 build version', () => {
    expect(APP_VERSION).toBe('0.3.0');
  });

  it('writes the version to local storage', () => {
    rememberAppVersion();

    expect(window.localStorage.getItem(APP_VERSION_STORAGE_KEY)).toBe(
      APP_VERSION,
    );
    expect(readStoredAppVersion()).toBe(APP_VERSION);
  });

  it('reads a stored version without touching it', () => {
    window.localStorage.setItem(APP_VERSION_STORAGE_KEY, '0.0.9');

    expect(readStoredAppVersion()).toBe('0.0.9');
    expect(window.localStorage.getItem(APP_VERSION_STORAGE_KEY)).toBe('0.0.9');
  });
});
