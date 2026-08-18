import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uploadRouter from '@pinnacle/server/api/upload';
import { getLocalIpAddress } from '@pinnacle/utils';
import { bucketDir } from './helpers';

export type NextServer = ReturnType<typeof startNextServer>;

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';

export function startNextServer({ port = 3000 }) {
  const app = express();
  const IP_ADDRESS = getLocalIpAddress() || 'localhost';

  if (!isDev) {
    const staticDir = path.join(__dirname, '../next');
    // Serve static assets
    app.use(express.static(staticDir));
  }

  app.use(uploadRouter);
  app.use('/bucket', express.static(bucketDir));
  app.use((_, res) => res.redirect('/'));

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://${IP_ADDRESS}:${port}`);
  });

  return server;
}
