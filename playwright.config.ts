import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 4174;
const API_PORT = 3101;
const BASE_URL = `http://127.0.0.1:${String(WEB_PORT)}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      scale: 'css',
    },
  },
  fullyParallel: false,
  // One shared in-memory database: tests stay deterministic when run in order.
  workers: 1,
  retries: 0,
  forbidOnly: process.env['CI'] === 'true',
  outputDir: 'test-results',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'desktop-safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'ipad-landscape',
      use: { ...devices['iPad (gen 7) landscape'] },
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'galaxy-tab-s4',
      use: { ...devices['Galaxy Tab S4 landscape'] },
    },
    {
      name: 'iphone-13-landscape',
      use: { ...devices['iPhone 13 landscape'] },
    },
    {
      name: 'pixel-7-landscape',
      use: { ...devices['Pixel 7 landscape'] },
    },
  ],
  webServer: [
    {
      // Dedicated MongoDB replica set, seeded with deterministic accounts.
      command: `NODE_ENV=test E2E_API_PORT=${String(API_PORT)} pnpm --filter @circuits/api run e2e:server`,
      url: `http://127.0.0.1:${String(API_PORT)}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Production build served by Vite preview; /api is proxied to the API.
      command: `pnpm --filter @circuits/web exec vite preview --host 127.0.0.1 --port ${String(WEB_PORT)} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
