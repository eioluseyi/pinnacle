import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import uploadRouter from './api/upload.js';

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

export async function startNextServer({ port = 3000 }) {
  const staticDir = path.join(__dirname, '../next-out');
  const bucketDir = path.join(electronApp.getPath('userData'), 'bucket');

  // Serve static assets
  app.use(express.static(staticDir));
  app.use(uploadRouter);
  app.use('/bucket', express.static(bucketDir));
  app.use((_, res) => res.status(404).sendFile(path.join(staticDir, '404')));

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  return app;
}
