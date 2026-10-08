import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Ephemeral lifecycle
  roomTtlMinutes: parseInt(process.env.ROOM_TTL_MINUTES, 10) || 30,
  cleanupIntervalMs: (parseInt(process.env.ROOM_CLEANUP_INTERVAL_SECONDS, 10) || 10) * 1000,

  // Security constraints
  maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 1000,
  maxParticipantsPerRoom: parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM, 10) || 10,
  maxMessagesPerRoom: parseInt(process.env.MAX_MESSAGES_PER_ROOM, 10) || 100,
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60,

  // Optional local AI (Ollama)
  ollama: {
    enabled: process.env.OLLAMA_ENABLED === 'true',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    timeoutMs: 3000 // fast timeout so chat doesn't stall if Ollama is slow/offline
  }
};
