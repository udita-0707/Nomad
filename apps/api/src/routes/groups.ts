import { Router } from 'express';
import { groupCreateRequestSchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../validation/validateBody.js';
import { createGroup, getMyGroups } from '../controllers/groupController.js';
import { cancelJoinRequest, createJoinRequest, decideGroupRequest, listGroupRequests } from '../controllers/requestController.js';
import { joinRequestSchema, decideRequestSchema } from '@nomad/shared';

export const groupsRouter = Router();

groupsRouter.get('/mine', requireAuth, asyncHandler(getMyGroups));
groupsRouter.post('/', requireAuth, validateBody(groupCreateRequestSchema), asyncHandler(createGroup));
groupsRouter.post('/:id/requests', requireAuth, validateBody(joinRequestSchema), asyncHandler(createJoinRequest));
groupsRouter.get('/:id/requests', requireAuth, asyncHandler(listGroupRequests));
groupsRouter.patch('/:id/requests/:travellerId', requireAuth, validateBody(decideRequestSchema), asyncHandler(decideGroupRequest));
groupsRouter.delete('/:id/requests/me', requireAuth, asyncHandler(cancelJoinRequest));
