import { startNextServer } from './next-server';
import { startSocketServer } from './socket-server';

await Promise.all([startNextServer({ port: 4000 }), startSocketServer()]);
