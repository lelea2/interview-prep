import type { ApiError } from '@interview-prep/shared';

// =============================================================================
// api/client.ts — Base fetch wrapper. Every api/*.ts helper goes through
// `request()` so response parsing, error shape, and the /api base path are
// defined once.
// =============================================================================

const BASE_URL = '/api';

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  // DELETE returns 204 with no body — nothing to parse.
  if (res.status === 204) {
    return undefined as T;
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const apiError = body as Partial<ApiError> | null;
    const message = apiError?.error ?? `Request failed with status ${res.status}`;
    throw new ApiRequestError(res.status, message, apiError?.details);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, data?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string): Promise<void> => request<void>(path, { method: 'DELETE' }),
};

export function toErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
