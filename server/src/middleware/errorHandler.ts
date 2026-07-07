import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@interview-prep/shared';
import { HttpError } from '../lib/httpError.js';

// Express only treats a middleware as an error handler if it has exactly
// 4 parameters, so `next` stays in the signature even though it's unused.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const body: ApiError = { error: 'Validation failed', details: err.flatten() };
    res.status(400).json(body);
    return;
  }

  if (err instanceof HttpError) {
    const body: ApiError = { error: err.message, details: err.details };
    res.status(err.status).json(body);
    return;
  }

  // body-parser (express.json()) throws a plain SyntaxError with a `body`
  // property for malformed JSON — treat that as a client error, not a 500.
  if (err instanceof SyntaxError && 'body' in err) {
    const body: ApiError = { error: 'Malformed JSON in request body' };
    res.status(400).json(body);
    return;
  }

  console.error(err);
  const body: ApiError = { error: 'Internal server error' };
  res.status(500).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiError = { error: `No route matches ${req.method} ${req.path}` };
  res.status(404).json(body);
}
