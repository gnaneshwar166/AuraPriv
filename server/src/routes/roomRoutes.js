import express from 'express';
import { roomStore } from '../services/roomStore.js';
import { privacyGuardian } from '../privacy/privacyGuardian.js';
import { RateLimiter, isValidRoomId, sanitizeText } from '../utils/security.js';
import { config } from '../config/index.js';

const router = express.Router();
const httpRateLimiter = new RateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);

// Middleware: Basic IP-based rate limiting
router.use((req, res, next) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!httpRateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.'
    });
  }
  next();
});

/**
 * POST /api/rooms
 * Create an ephemeral room with authoritative server-side expiration.
 */
router.post('/rooms', (req, res) => {
  try {
    const { ttlMinutes, roomType } = req.body || {};
    const parsedTtl = parseInt(ttlMinutes, 10);
    const validTtl = !isNaN(parsedTtl) && parsedTtl > 0 && parsedTtl <= 120
      ? parsedTtl
      : config.roomTtlMinutes;

    // p2p = max 2, group = max 10
    const type = roomType === 'p2p' ? 'p2p' : 'group';
    const maxParticipants = type === 'p2p' ? 2 : 10;

    const room = roomStore.createRoom(validTtl, maxParticipants, type);

    res.status(201).json({
      roomId: room.roomId,
      expiresAt: room.expiresAt,
      status: room.status,
      roomType: room.roomType,
      maxParticipants: room.maxParticipants
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create temporary room.' });
  }
});

/**
 * GET /api/rooms/:roomId
 * Check if temporary room exists and is currently active.
 */
router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;

  if (!isValidRoomId(roomId)) {
    return res.status(400).json({ error: 'Malformed room ID format.' });
  }

  const room = roomStore.getRoom(roomId);
  if (!room) {
    return res.status(404).json({
      error: 'Room does not exist or has expired.',
      status: 'expired'
    });
  }

  // Return minimal information required by the frontend
  res.json({
    roomId: room.roomId,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    status: room.status,
    roomType: room.roomType,
    maxParticipants: room.maxParticipants,
    participantCount: room.participants.size
  });
});

/**
 * POST /api/privacy/analyze
 * Optional pre-flight privacy check endpoint (mirrors client-side analysis)
 */
router.post('/privacy/analyze', async (req, res) => {
  const { content } = req.body || {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content must be a string.' });
  }

  const sanitized = sanitizeText(content);
  const result = await privacyGuardian.analyze(sanitized);

  res.json(result);
});

export default router;
