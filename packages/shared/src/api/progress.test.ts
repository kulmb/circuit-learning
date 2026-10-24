import { describe, expect, it } from 'vitest';

import { sandboxInputSchema, sandboxThumbnailSchema } from './progress';

describe('sandbox input schema', () => {
  it('accepts an image data URL for the thumbnail', () => {
    expect(
      sandboxThumbnailSchema.safeParse(
        'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      ).success,
    ).toBe(true);
    expect(
      sandboxThumbnailSchema.safeParse(
        'data:image/png;base64,iVBORw0KGgo=',
      ).success,
    ).toBe(true);
  });

  it('rejects remote URLs and non-image data URLs', () => {
    expect(
      sandboxThumbnailSchema.safeParse('https://example.test/pixel.png')
        .success,
    ).toBe(false);
    expect(
      sandboxThumbnailSchema.safeParse(
        'data:text/html;base64,PHNjcmlwdD4=',
      ).success,
    ).toBe(false);
  });

  it('keeps the thumbnail optional', () => {
    const result = sandboxInputSchema.safeParse({
      name: 'Mon circuit',
      data: { version: 1, components: [], wires: [] },
    });

    expect(result.success).toBe(true);
  });
});
