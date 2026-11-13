import { Router } from 'express';
import { hotelSearchQuerySchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateQuery } from '../validation/validateQuery.js';
import { getGroupHotels } from '../controllers/hotelController.js';

// Lane C: the Common Group Page, mounted at /api/groups/:id.
export const groupPageRouter = Router({ mergeParams: true });

groupPageRouter.get('/hotels', requireAuth, validateQuery(hotelSearchQuerySchema), asyncHandler(getGroupHotels));
