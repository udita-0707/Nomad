import express from 'express';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { profileRouter } from './routes/profile.js';
import { groupsRouter } from './routes/groups.js';
import { catalogRouter } from './routes/catalog.js';
import { searchesRouter } from './routes/searches.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/searches', searchesRouter);

app.use(notFound);
app.use(errorHandler);
