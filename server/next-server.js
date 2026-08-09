import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uploadRouter from './api/upload.js';
import { getLocalIpAddress } from '../electron/utils.js';
import { app as electronApp } from 'electron/main';

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startNextServer({ port = 3000 }) {
  const app = express();
  const IP_ADDRESS = getLocalIpAddress() || 'localhost';
  const staticDir = path.join(__dirname, '../next-out');
  const standAloneBucketDir = path.join(electronApp.getPath('userData'), 'bucket');
  const bucketDir = standAloneBucketDir;

  // Serve static assets
  app.use(express.static(staticDir));
  app.use(uploadRouter);
  app.use('/bucket', express.static(bucketDir));
  app.use((_, res) => res.status(404).sendFile(path.join(staticDir, '404')));

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://${IP_ADDRESS}:${port}`);
  });

  return server;
}
