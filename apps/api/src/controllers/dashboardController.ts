import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';

// TODO: GET /api/dashboard
// Return 200 { user, options: ['creator', 'seeker'] } using res.locals.user.
export async function getDashboard(_req: Request, _res: Response) {
  throw new AppError(501, 'INTERNAL', 'Dashboard not implemented yet');
}
