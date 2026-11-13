import { Router } from 'express';
import { signupRequestSchema, loginRequestSchema } from '@nomad/shared';
import { validateBody } from '../validation/validateBody.js';
import { requireAuth } from '../middleware/requireAuth.js';
import * as auth from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupRequestSchema), auth.signup);
authRouter.post('/login', validateBody(loginRequestSchema), auth.login);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
