import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';
const electronDir = path.resolve('electron');
const outdir = path.resolve('dist/electron');

const commonConfig = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: isDev,
  external: ['electron', 'electron-squirrel-startup', 'update-electron-app', 'node-syphon'],
};

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getAllFiles(fullPath);
    }

    return [fullPath];
  });
}

async function build() {
  if (!fs.existsSync(electronDir)) {
    console.error('❌ Electron root folder not found:', electronDir);
    process.exit(1);
  }

  const files = getAllFiles(electronDir);
  const entryPoints = files.filter((file) => file.endsWith('.ts'));

  if (entryPoints.length === 0) {
    console.error('❌ No TypeScript entry points found in electron/');
    process.exit(1);
  }

  for (const file of files.filter((file) => !file.endsWith('.ts'))) {
    const relativePath = path.relative(electronDir, file);
    const targetPath = path.join(outdir, relativePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(file, targetPath);
  }

  await esbuild.build({
    ...commonConfig,
    allowOverwrite: true,
    entryPoints,
    outdir,
    outbase: electronDir,
    outExtension: { '.js': '.cjs' }, // output bundled files as .cjs (e.g. main.ts -> main.cjs)
  });
}

build().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
