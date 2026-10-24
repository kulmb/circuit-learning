import { describe, expect, it } from 'vitest';

import { API_HEALTH_PATH, APP_NAME } from './index';

describe('shared package', () => {
  it('exposes the application name', () => {
    expect(APP_NAME).toBe('Les Circuits de Zap');
  });

  it('exposes the API health path', () => {
    expect(API_HEALTH_PATH).toBe('/api/health');
  });
});
