import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';

/**
 * useSocketChat
 * Handles real-time messaging, events, Snapchat-style typing indicators, and room state via Socket.IO.
 */
export function useSocketChat(roomId, senderId, userAlias, onRoomExpired) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [memberCount, setMemberCount] = useState(1);
  const [isCreator, setIsCreator] = useState(false);
  const [forcedPrivacyMode, setForcedPrivacyMode] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Join room
    socket.emit('join_room', { roomId, senderId, userAlias }, (res) => {
      if (res?.success) {
        setIsConnected(true);
        if (Array.isArray(res.room?.messages)) {
          setMessages(res.room.messages);
        }
        if (res.room?.participantCount) {
          setMemberCount(res.room.participantCount);
        }
        if (typeof res.room?.isCreator === 'boolean') {
          setIsCreator(res.room.isCreator);
        }
        if (typeof res.room?.forcedPrivacyMode === 'boolean') {
          setForcedPrivacyMode(res.room.forcedPrivacyMode);
        }
      } else {
        setConnectionError(res?.error || 'Failed to join room.');
      }
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onUserJoined = (data) => {
      setMemberCount((prev) => Math.min(prev + 1, 10));
      setMessages((prev) => [
        ...prev,
        {
          messageId: `sys_${Date.now()}`,
          isSystem: true,
          content: `👤 ${data.userAlias} joined the room.`,
          timestamp: data.timestamp
        }
      ]);
    };

    const onUserLeft = (data) => {
      setMemberCount((prev) => Math.max(prev - 1, 1));
      setMessages((prev) => [
        ...prev,
        {
          messageId: `sys_${Date.now()}`,
          isSystem: true,
          content: `👋 ${data.userAlias} left the room.`,
          timestamp: data.timestamp
        }
      ]);
      setTypingUsers((prev) => prev.filter((u) => u.senderId !== data.senderId));
    };

    const onUserTyping = (data) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.senderId === data.senderId)) return prev;
        return [...prev, { senderId: data.senderId, userAlias: data.userAlias }];
      });
    };

    const onUserStopTyping = (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.senderId !== data.senderId));
    };

    const onCreatorPrivacyUpdated = (data) => {
      setForcedPrivacyMode(!!data.forcedPrivacyMode);
      setMessages((prev) => [
        ...prev,
        {
          messageId: `sys_${Date.now()}`,
          isSystem: true,
          content: data.forcedPrivacyMode
            ? `🔒 Room Creator enforced Privacy Mode for both participants.`
            : `🔓 Room Creator unlocked forced Privacy Mode.`,
          timestamp: Date.now()
        }
      ]);
    };

    const onRoomExpiredHandler = () => {
      if (typeof onRoomExpired === 'function') {
        onRoomExpired();
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);
    socket.on('creator_privacy_updated', onCreatorPrivacyUpdated);
    socket.on('room_expired', onRoomExpiredHandler);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
      socket.off('creator_privacy_updated', onCreatorPrivacyUpdated);
      socket.off('room_expired', onRoomExpiredHandler);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [roomId, senderId, userAlias, onRoomExpired]);

  const sendTyping = useCallback((overrideAlias) => {
    if (!socket.connected || !roomId) return;
    socket.emit('typing', { roomId, userAlias: overrideAlias || userAlias });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { roomId });
    }, 3000);
  }, [roomId, userAlias]);

  const sendStopTyping = useCallback(() => {
    if (!socket.connected || !roomId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', { roomId });
  }, [roomId]);

  const sendMessage = useCallback((content, overrideAlias, overrideAvatar, overrideColor) => {
    sendStopTyping();
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        return reject(new Error('Socket is disconnected.'));
      }

      socket.emit(
        'send_message',
        {
          roomId,
          senderId,
          userAlias: overrideAlias || userAlias,
          userAvatar: overrideAvatar || '💬',
          userColor: overrideColor || '#38bdf8',
          content
        },
        (res) => {
          if (res?.success) {
            resolve(res);
          } else {
            reject(new Error(res?.error || 'Failed to dispatch message.'));
          }
        }
      );
    });
  }, [roomId, senderId, userAlias, sendStopTyping]);

  const toggleCreatorPrivacy = useCallback((enabled) => {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        return reject(new Error('Socket is disconnected.'));
      }

      socket.emit(
        'toggle_creator_privacy',
        { roomId, enabled },
        (res) => {
          if (res?.success) {
            resolve(res);
          } else {
            reject(new Error(res?.error || 'Failed to toggle creator privacy mode.'));
          }
        }
      );
    });
  }, [roomId]);

  return {
    messages,
    isConnected,
    connectionError,
    memberCount,
    isCreator,
    forcedPrivacyMode,
    typingUsers,
    sendTyping,
    sendStopTyping,
    sendMessage,
    toggleCreatorPrivacy
  };
}
