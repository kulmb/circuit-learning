import { afterEach, describe, expect, it } from 'vitest';

import { getApiErrorText } from './apiErrors';
import { setActiveLanguage } from './fr';

describe('API error translation', () => {
  afterEach(() => {
    setActiveLanguage('fr');
  });

  it('translates a stable code without the server message', () => {
    setActiveLanguage('en');
    expect(getApiErrorText('invalid_credentials')).toBe(
      'Wrong username or password.',
    );

    setActiveLanguage('zh');
    expect(getApiErrorText('picture_locked')).toBe('请找老师帮忙。');
  });

  it('falls back to null for an unknown code', () => {
    expect(getApiErrorText('something_new')).toBeNull();
  });
});
