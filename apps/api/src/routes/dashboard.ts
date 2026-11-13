import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getDashboard } from '../controllers/dashboardController.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, asyncHandler(getDashboard));
