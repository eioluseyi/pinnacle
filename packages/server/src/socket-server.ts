import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { getLocalIpAddress } from '@pinnacle/utils';

type DisplayData = unknown;
export type SocketServer = ReturnType<typeof startSocketServer>;

export const startSocketServer = ({ port = 1234 } = {}) => {
  const app = express();
  const IP_ADDRESS = getLocalIpAddress();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  let currentData: DisplayData;
  const displayClients = new Set<string>();

  const broadcastDisplayStatus = () => {
    io.emit('display-status', displayClients.size);
  };

  io.on('connection', (socket) => {
    socket.emit('display-status', displayClients.size);

    socket.on('register-display', () => {
      displayClients.add(socket.id);
      broadcastDisplayStatus();
    });

    if (currentData) {
      socket.emit('display-updated', currentData);
    }

    socket.on('update-display', (data: DisplayData) => {
      currentData = data;
      io.emit('display-updated', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      if (displayClients.delete(socket.id)) {
        broadcastDisplayStatus();
      }
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Socket.IO server running on http://${IP_ADDRESS}:${port}`);
  });

  return {
    close() {
      io.close();
      server.close();
    },
  };
};
