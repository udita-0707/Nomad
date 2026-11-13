import { Router } from 'express';
import { searchRequestSchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../validation/validateBody.js';
import { createSearch, getSearchMatches } from '../controllers/searchController.js';

export const searchesRouter = Router();

searchesRouter.post('/', requireAuth, validateBody(searchRequestSchema), asyncHandler(createSearch));
searchesRouter.get('/:id/matches', requireAuth, asyncHandler(getSearchMatches));
