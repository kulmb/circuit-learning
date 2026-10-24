import { API_BASE_URL } from '../config';

interface ResponseSchema<T> {
  parse(value: unknown): T;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  schema: ResponseSchema<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    signal: controller.signal,
  };

  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }

  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError(
      0,
      'network_error',
      'Le serveur ne répond pas. Vérifie la connexion.',
    );
  } finally {
    clearTimeout(timeout);
  }

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = readErrorBody(body);
    throw new ApiClientError(response.status, error.code, error.message);
  }

  return schema.parse(body);
}

function readErrorBody(body: unknown): { code: string; message: string } {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'object' &&
    (body as { error?: unknown }).error !== null
  ) {
    const error = (body as { error: { code?: unknown; message?: unknown } })
      .error;

    return {
      code: typeof error.code === 'string' ? error.code : 'api_error',
      message:
        typeof error.message === 'string'
          ? error.message
          : 'La demande a échoué.',
    };
  }

  return { code: 'api_error', message: 'La demande a échoué.' };
}
