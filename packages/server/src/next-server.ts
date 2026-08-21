import express from 'express';
import path from 'node:path';
import electron from 'electron';
import uploadRouter from '@pinnacle/server/src/api/upload';
import { getLocalIpAddress } from '@pinnacle/utils';
import { bucketDir } from './helpers';

export type NextServer = ReturnType<typeof startNextServer>;

const __dirname = path.dirname(__filename);
const app = electron.app || {};
const isDev = !app.isPackaged;
const devStaticDir = path.join(__dirname, '../next');
const prodStaticDir = path.join(__dirname, '../next');

export function startNextServer({ port = 3000 }) {
  const app = express();
  const IP_ADDRESS = getLocalIpAddress() || 'localhost';
  const staticDir = isDev ? devStaticDir : prodStaticDir;

  if (!isDev) {
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
