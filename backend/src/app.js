const express = require('express');
const cors = require('cors');
const http = require('http');

const { Server } = require('socket.io');

const crossingRoutes = require('./routes/crossings');
const adminRoutes = require('./routes/admin');

const setupSocket = require('./sockets/socketHandler');
const setupMQTT = require('./mqtt/mqttHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use('/api', crossingRoutes);
app.use('/api/admin', adminRoutes);

setupSocket(io);
setupMQTT(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});