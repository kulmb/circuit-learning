import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerSWMock } = vi.hoisted(() => ({
  registerSWMock: vi.fn(),
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

import { registerPwa } from './register';

const reload = vi.fn();

function installServiceWorker(): {
  addEventListener: ReturnType<typeof vi.fn>;
} {
  const serviceWorker = { addEventListener: vi.fn() };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorker,
  });
  return serviceWorker;
}

describe('registerPwa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubEnv('PROD', true);
    window.sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
    installServiceWorker();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('registers immediately and checks for a new worker at startup', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    registerSWMock.mockReturnValue(updateServiceWorker);

    registerPwa();

    expect(registerSWMock).toHaveBeenCalledTimes(1);
    const options = registerSWMock.mock.calls[0]?.[0];
    expect(options.immediate).toBe(true);

    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: null,
    };
    options.onRegisteredSW('sw.js', registration);

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('activates a worker left waiting by a previous session', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    registerSWMock.mockReturnValue(updateServiceWorker);

    registerPwa();

    const options = registerSWMock.mock.calls[0]?.[0];
    options.onRegisteredSW('sw.js', {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: {},
    });

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('reloads after requesting activation even without controlling event', () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    registerSWMock.mockReturnValue(updateServiceWorker);

    registerPwa();

    const options = registerSWMock.mock.calls[0]?.[0];
    options.onNeedRefresh();

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(reload).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2500);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the browser has no service worker', () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;

    registerPwa();

    expect(registerSWMock).not.toHaveBeenCalled();
  });
});
