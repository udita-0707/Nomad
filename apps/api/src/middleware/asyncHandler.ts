import type { Request, Response, NextFunction } from 'express';

// Express 4 doesn't catch rejected promises, so pass async errors to the error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
