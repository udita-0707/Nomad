import type { Request, Response } from 'express';
import type { DashboardResponse } from '@nomad/shared';
import { toPublicUser } from './authController.js';

// GET /api/dashboard (requireAuth)
export async function getDashboard(req: Request, res: Response) {
  const body: DashboardResponse = {
    user: toPublicUser(req.user!),
    options: ['group_creator', 'group_seeker'],
  };
  res.json(body);
}
