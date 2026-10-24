import { describe, expect, it } from 'vitest';

import { getLayoutMode } from './layoutMode';

describe('getLayoutMode', () => {
  it('uses the compact layout below 700 px wide', () => {
    const mode = getLayoutMode(699, 800);

    expect(mode.size).toBe('compact');
    expect(mode.orientation).toBe('portrait');
  });

  it('uses the compact layout below 500 px tall even when wide', () => {
    expect(getLayoutMode(900, 499).size).toBe('compact');
    expect(getLayoutMode(740, 360).size).toBe('compact');
    expect(getLayoutMode(740, 360).orientation).toBe('landscape');
  });

  it('keeps 700 x 500 and 1099 x 700 in the medium layout', () => {
    expect(getLayoutMode(700, 500).size).toBe('medium');
    expect(getLayoutMode(1024, 768).size).toBe('medium');
    expect(getLayoutMode(1099, 700).size).toBe('medium');
  });

  it('uses the large layout for roomy desktops', () => {
    expect(getLayoutMode(1100, 700).size).toBe('large');
    expect(getLayoutMode(1280, 900).size).toBe('large');
  });

  it('switches orientation when the container is taller than wide', () => {
    expect(getLayoutMode(768, 1024).orientation).toBe('portrait');
    expect(getLayoutMode(1024, 768).orientation).toBe('landscape');
  });

  it('falls back to finite dimensions', () => {
    expect(getLayoutMode(Number.NaN, 800).size).toBe('compact');
  });
});
