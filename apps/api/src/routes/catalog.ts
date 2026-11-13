import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getCatalog } from '../controllers/catalogController.js';

export const catalogRouter = Router();

catalogRouter.get('/', asyncHandler(getCatalog));
