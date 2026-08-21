import { startNextServer } from './next-server';
import { startSocketServer } from './socket-server';

Promise.all([startNextServer({ port: 4000 }), startSocketServer()]);
