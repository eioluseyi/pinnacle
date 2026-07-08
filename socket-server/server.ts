import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allows any origin
    methods: ['GET', 'POST'],
  },
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

let currentData: unknown;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  if (currentData) io.emit('display-updated', currentData);

  // Listen for the object coming from the control page
  socket.on('update-display', (data) => {
    console.log('Received data from control:', data);
    currentData = data;

    // Broadcast the object to all connected clients (the display page)
    io.emit('display-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Control page: http://localhost:${PORT}/control.html`);
  console.log(`Display page: http://localhost:${PORT}/display.html`);
});
