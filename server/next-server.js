import next from 'next';
import http from 'node:http';
import { fork } from 'child_process';
import path from 'node:path';

const appDir = process.resourcesPath;

export async function startNextServer({ port = 3000 }) {
  //   const hostname = '0.0.0.0';
  //   const dev = false;
  //   const nextApp = next({
  //     dev,
  //     hostname,
  //     port,
  //     dir: appDir,
  //   });

  const nextApp = fork(path.join(appDir, '.next/standalone/server.js'), [], {
    env: {
      ...process.env,
      PORT: '3000',
    },
  });

  await nextApp.prepare();

  const handler = nextApp.getRequestHandler();

  const server = http.createServer((req, res) => {
    handler(req, res);
  });

  server.listen(port, hostname, () => {
    console.log(`Next running at http://${hostname}:${port}`);
  });

  return server;
}
