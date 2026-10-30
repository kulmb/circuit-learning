export * from './api';
export * from './circuit';
export * from './levels/metadata';
export * from './levels/runtime';
export * from './levels/stars';
export * from './levels/success';
export type * from './levels/types';
export * from './progress';

export const APP_NAME = 'Les Circuits de Zap' as const;

export const API_HEALTH_PATH = '/api/health' as const;

export interface HealthResponse {
  readonly ok: true;
}
