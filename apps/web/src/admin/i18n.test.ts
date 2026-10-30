import { afterEach, describe, expect, it } from 'vitest';

import { setActiveLanguage } from '../narration/fr';
import {
  adminTexts,
  adminTextsI18n,
} from './fr';
import { adminTextsEn } from './texts.en';
import { adminTextsZh } from './texts.zh';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'function' || Array.isArray(value)) {
    return [prefix];
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix === '' ? key : `${prefix}.${key}`),
    );
  }

  return [prefix];
}

function valueAt(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((node, key) => {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }

    return (node as Record<string, unknown>)[key];
  }, root);
}

describe('admin dictionaries', () => {
  afterEach(() => {
    setActiveLanguage('fr');
  });

  it('mirrors every French key in English and Chinese', () => {
    const french = leafPaths(adminTexts).sort();
    const english = leafPaths(adminTextsEn).sort();
    const chinese = leafPaths(adminTextsZh).sort();

    expect(english).toEqual(french);
    expect(chinese).toEqual(french);

    for (const path of french) {
      const keys = path.split('.');
      expect(valueAt(adminTextsEn, keys), `en ${path}`).toBeTruthy();
      expect(valueAt(adminTextsZh, keys), `zh ${path}`).toBeTruthy();
    }
  });

  it('serves the active dictionary through the nested proxy', () => {
    expect(adminTextsI18n.appName).toBe(adminTexts.appName);

    setActiveLanguage('en');
    expect(adminTextsI18n.appName).toBe(adminTextsEn.appName);
    expect(adminTextsI18n.groups.studentCount(2)).toBe(
      adminTextsEn.groups.studentCount(2),
    );

    setActiveLanguage('zh');
    expect(adminTextsI18n.appName).toBe(adminTextsZh.appName);
    expect(adminTextsI18n.groups.studentCount(2)).toBe(
      adminTextsZh.groups.studentCount(2),
    );
  });
});
