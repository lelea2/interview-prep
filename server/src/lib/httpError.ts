// Thrown by route handlers to signal a specific HTTP status + message.
// Caught by the error-handling middleware in middleware/errorHandler.ts.
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
