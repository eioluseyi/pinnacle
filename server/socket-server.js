import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';

export const startSocketServer = ({ port = 1234 } = {}) => {
  const app = express();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Serve static files if you still need this
  // app.use(express.static('public'));

  let currentData;

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    if (currentData) {
      socket.emit('display-updated', currentData);
    }

    socket.on('update-display', (data) => {
      console.log('Received data from control:', data);

      currentData = data;

      io.emit('display-updated', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Socket.IO server running on http://0.0.0.0:${port}`);
  });

  return {
    close() {
      io.close();
      server.close();
    },
  };
};
