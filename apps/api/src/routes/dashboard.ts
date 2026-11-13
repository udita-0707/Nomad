import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getDashboard } from '../controllers/dashboardController.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, getDashboard);
