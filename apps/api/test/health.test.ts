import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const openApps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe('GET /api/health', () => {
  it('returns an ok response', async () => {
    const app = buildApp({ logger: false });
    openApps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
