export * from './circuit';
export * from './levels';
export * from './progress';

export const APP_NAME = 'Les Circuits de Zap' as const;

export const API_HEALTH_PATH = '/api/health' as const;

export interface HealthResponse {
  readonly ok: true;
}
