import { Router } from 'express';
import { bookingRequestSchema, hotelSearchQuerySchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../validation/validateBody.js';
import { validateQuery } from '../validation/validateQuery.js';
import { getGroupHotels } from '../controllers/hotelController.js';
import { createBooking, getBooking } from '../controllers/bookingController.js';

// Lane C: the Common Group Page, mounted at /api/groups/:id.
export const groupPageRouter = Router({ mergeParams: true });

groupPageRouter.get('/hotels', requireAuth, validateQuery(hotelSearchQuerySchema), asyncHandler(getGroupHotels));
groupPageRouter.get('/booking', requireAuth, asyncHandler(getBooking));
groupPageRouter.post('/booking', requireAuth, validateBody(bookingRequestSchema), asyncHandler(createBooking));
