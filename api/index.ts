import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createApiRouter } from '../server/api.ts';
import { erpStore } from '../server/store.ts';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Ensure MongoDB Atlas is connected before serving any API request in Vercel Serverless
app.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await erpStore.init();
    next();
  } catch (err) {
    console.error('[KinLedger Vercel API] Database initialization failed:', err);
    res.status(503).json({
      error: (err as Error).message || 'Database connection failed. Check MONGODB_URI in Vercel environment variables.',
    });
  }
});

const apiRouter = createApiRouter();
app.use('/api', apiRouter);
app.use('/', apiRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[KinLedger Vercel API] Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({
    error: err instanceof Error ? err.message : 'Internal server error',
  });
});

export default app;
