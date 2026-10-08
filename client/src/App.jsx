import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import ChatRoomPage from './pages/ChatRoomPage';
import ExpiredPage from './pages/ExpiredPage';
import { createRoomApi, lookupRoomApi } from './services/api';
import { getOrCreateSessionId } from './utils/session';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing' | 'room' | 'expired'
  const [roomMetadata, setRoomMetadata] = useState(null);
  const [userAlias, setUserAlias] = useState('');
  const [senderId] = useState(() => getOrCreateSessionId());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle URL on initial mount (?room=XYZ or /room/XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (roomParam) {
      validateAndEnterRoom(roomParam, 'Participant');
    }
  }, []);

  const validateAndEnterRoom = async (roomId, alias) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const room = await lookupRoomApi(roomId);
      setRoomMetadata(room);
      setUserAlias(alias);
      setCurrentPage('room');
      window.history.pushState({}, '', `?room=${room.roomId}`);
    } catch (err) {
      setRoomMetadata({ roomId });
      setCurrentPage('expired');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (ttlMinutes, alias, roomType = 'group') => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const room = await createRoomApi(ttlMinutes, roomType);
      setRoomMetadata(room);
      setUserAlias(alias);
      setCurrentPage('room');
      window.history.pushState({}, '', `?room=${room.roomId}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create temporary room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId, alias) => {
    await validateAndEnterRoom(roomId, alias);
  };

  const handleLeaveRoom = () => {
    setRoomMetadata(null);
    setCurrentPage('landing');
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleRoomExpired = () => {
    setCurrentPage('expired');
  };

  return (
    <div className="app-shell">
      <Header
        inRoom={currentPage === 'room'}
        onLeaveRoom={handleLeaveRoom}
      />

      <main className="page-content">
        {currentPage === 'landing' && (
          <LandingPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isLoading={isLoading}
            error={errorMessage}
          />
        )}

        {currentPage === 'room' && roomMetadata && (
          <ChatRoomPage
            roomMetadata={roomMetadata}
            senderId={senderId}
            userAlias={userAlias}
            onLeaveRoom={handleLeaveRoom}
            onRoomExpired={handleRoomExpired}
          />
        )}

        {currentPage === 'expired' && (
          <ExpiredPage
            roomId={roomMetadata?.roomId}
            onReturnHome={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  );
}
