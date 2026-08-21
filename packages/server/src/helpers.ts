import path from 'node:path';
import electron from 'electron';

const app = electron.app || {};
const __dirname = path.dirname(__filename);

let userDataPath = '';
try {
  if (app && typeof app.getPath === 'function') {
    userDataPath = app.getPath('userData');
  }
} catch {}

const standAloneBucketDir = path.join(userDataPath, 'bucket');
const appRootBucketDir = path.join(process.cwd(), 'public', 'bucket');
const prodBucketDir = userDataPath ? standAloneBucketDir : appRootBucketDir;
const devBucketDir = path.join(__dirname, '../../../apps/web-app/public/bucket');
const isDev = !app.isPackaged;

export const bucketDir = isDev ? devBucketDir : prodBucketDir;
