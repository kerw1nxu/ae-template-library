export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function invariant(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) {
    throw new HttpError(status, message);
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getErrorStatus(error: unknown, fallback = 500) {
  return error instanceof HttpError ? error.status : fallback;
}
