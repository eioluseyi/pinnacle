import { build } from 'esbuild';

async function main() {
  await build({
    entryPoints: ['index.ts'],
    outfile: '../../apps/desktop/dist/server.mjs',

    bundle: true,
    platform: 'node',
    format: 'esm',

    alias: {
      '@pinnacle/server': '.',
      '@pinnacle/utils': '../utils/src',
    },

    external: ['electron'],

    sourcemap: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
