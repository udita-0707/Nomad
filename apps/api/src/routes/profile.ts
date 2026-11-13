import { Router } from 'express';
import { profileRequestSchema } from '@nomad/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../validation/validateBody.js';
import { getProfile, putProfile } from '../controllers/profileController.js';

export const profileRouter = Router();

profileRouter.get('/', requireAuth, asyncHandler(getProfile));
profileRouter.put('/', requireAuth, validateBody(profileRequestSchema), asyncHandler(putProfile));
