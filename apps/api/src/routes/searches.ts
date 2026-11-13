import { Router } from 'express';
import { matchFiltersQuerySchema, searchRequestSchema } from '@nomad/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../validation/validateBody.js';
import { validateQuery } from '../validation/validateQuery.js';
import { createSearch, getSearchMatches } from '../controllers/searchController.js';

export const searchesRouter = Router();

searchesRouter.post('/', requireAuth, validateBody(searchRequestSchema), asyncHandler(createSearch));
searchesRouter.get('/:id/matches', requireAuth, validateQuery(matchFiltersQuerySchema), asyncHandler(getSearchMatches));
