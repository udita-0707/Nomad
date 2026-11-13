import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { profileRouter } from './routes/profile.js';
import { groupsRouter } from './routes/groups.js';
import { groupPageRouter } from './routes/groupPage.js';
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
app.use('/api/groups/:id', groupPageRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/searches', searchesRouter);

// Hotel photos and their credits (images/ATTRIBUTIONS.md), served from the repo's images folder.
const imagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../images');
app.use('/api/hotel-images', express.static(path.join(imagesDir, 'hotels')));
app.get('/api/photo-credits', (_req, res) => res.type('text/plain').sendFile(path.join(imagesDir, 'ATTRIBUTIONS.md')));

app.use(notFound);
app.use(errorHandler);
