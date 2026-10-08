import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import roomRoutes from './routes/roomRoutes.js';
import { initializeChatSocket } from './socket/chatSocket.js';
import { roomStore } from './services/roomStore.js';
import { safeLogger } from './utils/security.js';

export const app = express();
export const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: config.clientOrigin,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Basic security response headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '100kb' }));

// REST Routes
app.use('/api', roomRoutes);

// Root status endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AuraPriv Backend Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 450px; border: 1px solid #334155; }
          h1 { color: #38bdf8; font-size: 1.8rem; margin-top: 0; }
          p { color: #94a3b8; font-size: 1rem; line-height: 1.5; }
          .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 15px; transition: transform 0.2s, opacity 0.2s; }
          .btn:hover { opacity: 0.9; transform: translateY(-2px); }
          .status { display: inline-block; padding: 4px 12px; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="status">● Server Online (Port ${config.port})</div>
          <h1>AuraPriv API Backend</h1>
          <p>This is the backend API and Socket.IO server powering AuraPriv.</p>
          <p>To access the user interface, open the frontend app below:</p>
          <a class="btn" href="${config.clientOrigin}">Open AuraPriv Web App (${config.clientOrigin})</a>
        </div>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI-Adaptive Ephemeral Privacy Communication System',
    activeRooms: roomStore.getActiveRoomCount(),
    timestamp: new Date().toISOString()
  });
});

// Setup Socket.IO
export const io = new Server(server, {
  cors: {
    origin: config.clientOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

initializeChatSocket(io);

// Start authoritative lifecycle cleanup daemon
roomStore.startCleanupDaemon(io);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    safeLogger.info(`Server started successfully`, {
      port: config.port,
      clientOrigin: config.clientOrigin,
      roomTtlMinutes: config.roomTtlMinutes
    });
  });
}
