import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely get userData if running inside Electron
let userDataPath = '';
try {
  // When bundled into Electron, 'electron' can be imported statically
  // Using a clean ES import works since esbuild marks 'electron' as external:
  if (process.versions.hasOwnProperty('electron')) {
    // eslint-disable-path-disable @typescript-eslint/no-require-imports
    const electron = eval('require("electron/main")');
    const app = electron.app || electron.remote?.app;
    if (app) {
      userDataPath = app.getPath('userData');
    }
  }
} catch {}

const standAloneBucketDir = path.join(userDataPath, 'bucket');
const appRootBucketDir = path.join(process.cwd(), 'public', 'bucket');
const prodBucketDir = userDataPath ? standAloneBucketDir : appRootBucketDir;
const devBucketDir = path.join(__dirname, '../../../apps/web-app/public/bucket');
const isDev = process.env.NODE_ENV !== 'production';

export const bucketDir = isDev ? devBucketDir : prodBucketDir;
