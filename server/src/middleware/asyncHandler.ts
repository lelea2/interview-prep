import type { NextFunction, Request, Response } from 'express';

// Wraps an async route handler so a rejected promise (thrown error, failed
// validation, etc.) is forwarded to Express's error-handling middleware
// instead of crashing the process or hanging the request.
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
