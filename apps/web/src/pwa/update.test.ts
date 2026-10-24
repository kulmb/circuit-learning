import { beforeEach, describe, expect, it } from 'vitest';

import {
  consumePwaUpgradeNotice,
  markPwaUpgradePending,
  PWA_UPDATE_NOTICE_KEY,
  resetPwaUpgradeNotice,
} from './update';

describe('PWA upgrade notice', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetPwaUpgradeNotice();
  });

  it('survives one reload and is consumed only once', () => {
    markPwaUpgradePending();

    expect(window.sessionStorage.getItem(PWA_UPDATE_NOTICE_KEY)).toBe('1');
    expect(consumePwaUpgradeNotice()).toBe(true);
    expect(consumePwaUpgradeNotice()).toBe(false);
    expect(window.sessionStorage.getItem(PWA_UPDATE_NOTICE_KEY)).toBeNull();
  });

  it('ignores a missing or unrelated flag', () => {
    expect(consumePwaUpgradeNotice()).toBe(false);

    window.sessionStorage.setItem(PWA_UPDATE_NOTICE_KEY, '0');
    expect(consumePwaUpgradeNotice()).toBe(false);
  });
});
