import { Router } from 'express';
import type { HealthResponse } from '@nomad/shared';
import { checkDb } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const body: HealthResponse = { status: 'ok', db: (await checkDb()) ? 'up' : 'down' };
  res.json(body);
});
