import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './server/api.ts';
import { realtimeHub } from './server/realtime.ts';
import { erpStore } from './server/store.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  await erpStore.init();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Shared API for Web, Android, and iOS clients
  app.use('/api', createApiRouter());

  const server = http.createServer(app);
  realtimeHub.attach(server);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[KinLedger ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[KinLedger ERP] Fatal startup error:', err);
  process.exit(1);
});
