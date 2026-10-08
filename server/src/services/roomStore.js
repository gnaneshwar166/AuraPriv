import { generateSecureRoomId, isValidRoomId, safeLogger } from '../utils/security.js';
import { config } from '../config/index.js';

const MEMBER_PROFILES = [
  { name: 'Member 1 (Alex)', avatar: '🦊', color: '#38bdf8' },
  { name: 'Member 2 (Blair)', avatar: '🐼', color: '#4ade80' },
  { name: 'Member 3 (Charlie)', avatar: '🦁', color: '#c084fc' },
  { name: 'Member 4 (Diana)', avatar: '🐯', color: '#f87171' },
  { name: 'Member 5 (Ethan)', avatar: '🦅', color: '#facc15' },
  { name: 'Member 6 (Fiona)', avatar: '🦄', color: '#f472b6' },
  { name: 'Member 7 (George)', avatar: '🐺', color: '#fb923c' },
  { name: 'Member 8 (Hannah)', avatar: '🐨', color: '#a78bfa' },
  { name: 'Member 9 (Ian)', avatar: '🐸', color: '#34d399' },
  { name: 'Member 10 (Julia)', avatar: '🦉', color: '#eab308' }
];

/**
 * Ephemeral In-Memory Room Store
 * Manages active rooms, participants, and volatile message history.
 * Purges all state when room reaches its expiration timestamp.
 */
class RoomStore {
  constructor() {
    this.rooms = new Map(); // roomId -> RoomObject
  }

  /**
   * Create a new ephemeral room with an expiration timestamp
   */
  createRoom(ttlMinutes = config.roomTtlMinutes, maxParticipants = config.maxParticipantsPerRoom, roomType = 'group') {
    const roomId = generateSecureRoomId();
    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;

    const room = {
      roomId,
      createdAt: now,
      expiresAt,
      ttlMinutes,
      status: 'active',
      roomType,
      maxParticipants,
      participants: new Map(), // socketId -> { socketId, senderId, userAlias, userAvatar, userColor, joinedAt }
      messages: [] // in-memory message list, purged on expiration
    };

    this.rooms.set(roomId, room);
    safeLogger.info(`Ephemeral room created`, { roomId, ttlMinutes, roomType, maxParticipants, expiresAt: new Date(expiresAt).toISOString() });

    return {
      roomId: room.roomId,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      status: room.status,
      roomType: room.roomType,
      maxParticipants: room.maxParticipants
    };
  }

  /**
   * Retrieve active room. If expired, triggers cleanup and returns null.
   */
  getRoom(roomId) {
    if (!isValidRoomId(roomId)) return null;

    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return null;

    // Authoritative server-side expiration check
    if (Date.now() >= room.expiresAt) {
      this.purgeRoom(room.roomId);
      return null;
    }

    return room;
  }

  /**
   * Add a participant to an active room
   */
  addParticipant(roomId, socketId, senderId, userAlias = 'Anonymous') {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Room expired or nonexistent.' };

    if (room.participants.size >= room.maxParticipants) {
      const label = room.roomType === 'p2p' ? '1-on-1 P2P room' : 'group room';
      return { success: false, error: `This ${label} is full. Maximum ${room.maxParticipants} members allowed.` };
    }

    const isFirstParticipant = room.participants.size === 0;
    if (isFirstParticipant || !room.creatorSenderId) {
      room.creatorSenderId = senderId;
    }

    const profileIndex = room.participants.size % MEMBER_PROFILES.length;
    const defaultProfile = MEMBER_PROFILES[profileIndex];

    let assignedAlias = userAlias;
    if (!userAlias || userAlias === 'Anonymous' || userAlias === 'Participant' || userAlias === 'Room Creator') {
      assignedAlias = defaultProfile.name;
    }

    const userAvatar = defaultProfile.avatar;
    const userColor = defaultProfile.color;

    room.participants.set(socketId, {
      socketId,
      senderId,
      userAlias: assignedAlias.slice(0, 30),
      userAvatar,
      userColor,
      joinedAt: Date.now()
    });

    return {
      success: true,
      participantCount: room.participants.size,
      isCreator: room.creatorSenderId === senderId,
      forcedPrivacyMode: !!room.forcedPrivacyMode,
      assignedAlias,
      userAvatar,
      userColor
    };
  }

  /**
   * Remove participant on disconnect or leave
   */
  removeParticipant(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(socketId);
    if (participant) {
      room.participants.delete(socketId);
      return {
        participant,
        remainingCount: room.participants.size
      };
    }
    return null;
  }

  /**
   * Add a message to volatile room memory
   */
  addMessage(roomId, message) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    if (room.messages.length >= config.maxMessagesPerRoom) {
      // Drop oldest message to preserve fixed memory bound
      room.messages.shift();
    }

    const newMsg = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: room.roomId,
      senderId: message.senderId,
      userAlias: (message.userAlias || 'Anonymous').slice(0, 30),
      userAvatar: message.userAvatar || '💬',
      userColor: message.userColor || '#38bdf8',
      content: message.content.slice(0, config.maxMessageLength),
      timestamp: Date.now()
    };

    room.messages.push(newMsg);
    return newMsg;
  }

  /**
   * Application-controlled cleanup: wipes room and volatile memory
   */
  purgeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // 1. Mark status expired
    room.status = 'expired';

    // 2. Explicitly clear all arrays and maps in memory
    room.messages.length = 0;
    room.participants.clear();

    // 3. Remove room from active Map
    this.rooms.delete(roomId);

    safeLogger.info(`Room cleared from active memory`, { roomId });
    return true;
  }

  /**
   * Periodic daemon to expire rooms even when no sockets are active
   */
  startCleanupDaemon(io) {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms.entries()) {
        if (now >= room.expiresAt) {
          safeLogger.info(`Room expired by lifecycle daemon`, { roomId });

          // Notify clients if Socket.IO is initialized
          if (io) {
            io.to(roomId).emit('room_expired', {
              roomId,
              message: 'This temporary room has expired and active storage has been cleared.'
            });

            // Disconnect all sockets in that room
            const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
            if (socketsInRoom) {
              for (const socketId of socketsInRoom) {
                const s = io.sockets.sockets.get(socketId);
                if (s) {
                  s.leave(roomId);
                }
              }
            }
          }

          this.purgeRoom(roomId);
        }
      }
    }, config.cleanupIntervalMs);
    if (timer && timer.unref) timer.unref();
  }

  /**
   * Count active rooms (for testing and health metrics)
   */
  getActiveRoomCount() {
    return this.rooms.size;
  }
}

export const roomStore = new RoomStore();
