import { Router } from 'express';
import { groupCreateRequestSchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../validation/validateBody.js';
import { createGroup, getMyGroups } from '../controllers/groupController.js';

export const groupsRouter = Router();

groupsRouter.get('/mine', requireAuth, asyncHandler(getMyGroups));
groupsRouter.post('/', requireAuth, validateBody(groupCreateRequestSchema), asyncHandler(createGroup));
