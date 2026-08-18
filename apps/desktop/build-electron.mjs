import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';
const electronDir = path.resolve('electron');
const outDir = path.resolve('dist-electron');

const commonConfig = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: isDev,
  external: [
    'electron',
    'express',
    'socket.io',
    'socket.io-client',
    'multer',
    '@sentry/electron',
    'electron-squirrel-startup',
    'update-electron-app',
  ],
};
async function build() {
  // 1. Read all .ts files directly inside the electron/ directory
  const files = fs.readdirSync(electronDir);
  const entryPoints = files.filter((file) => file.endsWith('.ts')).map((file) => path.join(electronDir, file));

  if (entryPoints.length === 0) {
    console.error('❌ No TypeScript entry points found in electron/');
    process.exit(1);
  }

  // 2. Build all discovered files concurrently using esbuild's entryPoints object or array
  await esbuild.build({
    ...commonConfig,
    entryPoints: entryPoints,
    outdir: outDir, // outdir automatically preserves filenames (e.g. main.ts -> main.js)
  });
}

build().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
