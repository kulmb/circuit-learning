import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

class MemoryStream extends Writable {
  readonly chunks: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }
}

describe('request logging', () => {
  it('logs the route template, never the token in the URL', async () => {
    const stream = new MemoryStream();
    const app = buildApp({
      logger: { level: 'info', stream },
      cookieSecret: 'test-cookie-secret-0123456789abcdef',
      secureCookies: false,
      publicOrigin: 'https://zap.test',
      rateLimitMax: 1000,
    });

    // A token-shaped route with no database access, so the assertion focuses
    // on the logger and not on the invite service.
    app.get('/test/token/:token', async () => ({ ok: true }));
    await app.ready();

    const secret = 'SUPER_SECRET_INVITE_TOKEN_1234567890';
    const response = await app.inject({
      method: 'GET',
      url: `/test/token/${secret}`,
    });

    expect(response.statusCode).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 30));
    await app.close();

    const output = stream.chunks.join('');
    expect(output).not.toContain(secret);
    expect(output).toContain('/test/token/:token');
  });
});
