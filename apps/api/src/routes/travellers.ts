import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getTravellerProfile } from '../controllers/travellerController.js';

export const travellersRouter = Router();
travellersRouter.get('/:id', requireAuth, asyncHandler(getTravellerProfile));
