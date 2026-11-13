import { Router } from 'express';
import { signupRequestSchema, loginRequestSchema } from '@nomad/shared';
import { validateBody } from '../validation/validateBody.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as auth from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupRequestSchema), asyncHandler(auth.signup));
authRouter.post('/login', validateBody(loginRequestSchema), asyncHandler(auth.login));
authRouter.post('/logout', asyncHandler(auth.logout));
authRouter.get('/me', requireAuth, asyncHandler(auth.me));
