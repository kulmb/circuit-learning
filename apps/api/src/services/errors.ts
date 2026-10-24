/** An error that is safe to show to an API caller. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function unauthorized(
  message = 'Tu dois te connecter pour continuer.',
): ApiError {
  return new ApiError(401, 'unauthorized', message);
}

export function forbidden(
  message = 'Tu n’as pas le droit de faire cela.',
): ApiError {
  return new ApiError(403, 'forbidden', message);
}

export function notFound(message = 'Introuvable.'): ApiError {
  return new ApiError(404, 'not_found', message);
}
