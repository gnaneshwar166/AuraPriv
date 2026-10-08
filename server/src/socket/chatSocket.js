import { roomStore } from '../services/roomStore.js';
import { sanitizeText, RateLimiter, safeLogger } from '../utils/security.js';
import { config } from '../config/index.js';

// Rate limiter per socket connection (max 10 messages per 5 seconds)
const socketRateLimiter = new RateLimiter(5000, 10);

export function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    let activeRoomId = null;
    let activeSenderId = null;

    /**
     * join_room event
     * Validates room status before granting entry.
     */
    socket.on('join_room', ({ roomId, senderId, userAlias }, callback) => {
      if (!roomId || typeof roomId !== 'string') {
        if (typeof callback === 'function') callback({ success: false, error: 'Invalid room ID.' });
        return;
      }

      const room = roomStore.getRoom(roomId);
      if (!room) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'This room does not exist or has expired.' });
        }
        return;
      }

      const cleanAlias = sanitizeText(userAlias || 'Participant');
      const cleanSenderId = sanitizeText(senderId || socket.id);

      const joinResult = roomStore.addParticipant(room.roomId, socket.id, cleanSenderId, cleanAlias);
      if (!joinResult.success) {
        if (typeof callback === 'function') callback({ success: false, error: joinResult.error });
        return;
      }

      activeRoomId = room.roomId;
      activeSenderId = cleanSenderId;

      socket.join(room.roomId);

      // Notify others in room
      socket.to(room.roomId).emit('user_joined', {
        senderId: cleanSenderId,
        userAlias: cleanAlias,
        timestamp: Date.now()
      });

      safeLogger.info('User joined room', { roomId: room.roomId });

      // Return initial room state
      if (typeof callback === 'function') {
        callback({
          success: true,
          room: {
            roomId: room.roomId,
            expiresAt: room.expiresAt,
            messages: room.messages,
            participantCount: room.participants.size,
            maxParticipants: room.maxParticipants,
            roomType: room.roomType,
            isCreator: joinResult.isCreator,
            forcedPrivacyMode: joinResult.forcedPrivacyMode
          }
        });
      }
    });

    /**
     * toggle_creator_privacy event
     * Only available in P2P rooms (max 2) for the room creator.
     */
    socket.on('toggle_creator_privacy', ({ roomId, enabled }, callback) => {
      const room = roomStore.getRoom(roomId);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room expired or nonexistent.' });
        return;
      }

      if (room.roomType !== 'p2p') {
        if (typeof callback === 'function') callback({ success: false, error: 'Creator Forced Privacy Mode is only available in 1-on-1 P2P rooms.' });
        return;
      }

      if (room.creatorSenderId !== activeSenderId) {
        if (typeof callback === 'function') callback({ success: false, error: 'Only the room creator can force privacy mode for both participants.' });
        return;
      }

      room.forcedPrivacyMode = !!enabled;
      safeLogger.info(`Creator forced privacy mode updated`, { roomId: room.roomId, forcedPrivacyMode: room.forcedPrivacyMode });

      // Broadcast update to all clients in the room (including creator)
      io.to(room.roomId).emit('creator_privacy_updated', {
        forcedPrivacyMode: room.forcedPrivacyMode,
        setBy: activeSenderId
      });

      if (typeof callback === 'function') {
        callback({ success: true, forcedPrivacyMode: room.forcedPrivacyMode });
      }
    });

    /**
     * typing / stop_typing events (Snapchat-style real-time typing indicator)
     */
    socket.on('typing', ({ roomId, userAlias }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', {
        senderId: activeSenderId || socket.id,
        userAlias: sanitizeText(userAlias || 'Participant')
      });
    });

    socket.on('stop_typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_stop_typing', {
        senderId: activeSenderId || socket.id
      });
    });

    /**
     * send_message event
     * Validates content, length, rate-limits, and broadcasts to room participants.
     */
    socket.on('send_message', ({ roomId, senderId, userAlias, userAvatar, userColor, content }, callback) => {
      // 1. Rate-limit check per socket
      if (!socketRateLimiter.isAllowed(socket.id)) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Rate limit exceeded. Please wait a moment.' });
        }
        return;
      }

      // 2. Room existence and expiration check
      const room = roomStore.getRoom(roomId);
      if (!room) {
        socket.emit('room_expired', { roomId });
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Room has expired. Messages cannot be delivered.' });
        }
        return;
      }

      // 3. Message structure and content validation
      if (!content || typeof content !== 'string') {
        if (typeof callback === 'function') callback({ success: false, error: 'Message content cannot be empty.' });
        return;
      }

      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        if (typeof callback === 'function') callback({ success: false, error: 'Message cannot be empty.' });
        return;
      }

      if (trimmedContent.length > config.maxMessageLength) {
        if (typeof callback === 'function') {
          callback({ success: false, error: `Message exceeds maximum limit of ${config.maxMessageLength} characters.` });
        }
        return;
      }

      // 4. Sanitize and store message in volatile memory
      const sanitized = sanitizeText(trimmedContent);
      const cleanAlias = sanitizeText(userAlias || 'Participant');
      const cleanSenderId = sanitizeText(senderId || socket.id);
      const cleanAvatar = sanitizeText(userAvatar || '💬');
      const cleanColor = sanitizeText(userColor || '#38bdf8');

      const storedMessage = roomStore.addMessage(room.roomId, {
        senderId: cleanSenderId,
        userAlias: cleanAlias,
        userAvatar: cleanAvatar,
        userColor: cleanColor,
        content: sanitized
      });

      if (!storedMessage) {
        if (typeof callback === 'function') callback({ success: false, error: 'Failed to deliver message.' });
        return;
      }

      // 5. Broadcast to everyone in the room (including sender or acknowledge)
      io.to(room.roomId).emit('receive_message', storedMessage);

      // Safe logging (never logs message content)
      safeLogger.info('Message relayed', { roomId: room.roomId, messageId: storedMessage.messageId });

      if (typeof callback === 'function') {
        callback({ success: true, messageId: storedMessage.messageId });
      }
    });

    /**
     * Clean disconnect handling
     */
    socket.on('disconnect', () => {
      if (activeRoomId) {
        const removal = roomStore.removeParticipant(activeRoomId, socket.id);
        if (removal && removal.participant) {
          socket.to(activeRoomId).emit('user_left', {
            senderId: removal.participant.senderId,
            userAlias: removal.participant.userAlias,
            timestamp: Date.now()
          });
        }
      }
    });
  });
}
