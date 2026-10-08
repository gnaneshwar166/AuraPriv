import { describe, it } from 'node:test';
import assert from 'node:assert';
import { roomStore } from '../src/services/roomStore.js';

describe('RoomStore & Ephemeral Lifecycle Tests', () => {
  it('creates an ephemeral room with unique ID and expiration', () => {
    const room = roomStore.createRoom(15);
    assert.ok(room.roomId, 'Room should have a roomId');
    assert.strictEqual(typeof room.roomId, 'string');
    assert.ok(room.expiresAt > Date.now(), 'Expiration must be in future');
    assert.strictEqual(room.status, 'active');
  });

  it('retrieves an active room correctly', () => {
    const created = roomStore.createRoom(10);
    const retrieved = roomStore.getRoom(created.roomId);
    assert.ok(retrieved, 'Should retrieve existing room');
    assert.strictEqual(retrieved.roomId, created.roomId);
  });

  it('rejects nonexistent or malformed room IDs', () => {
    assert.strictEqual(roomStore.getRoom('INVALID_ID_99999'), null);
    assert.strictEqual(roomStore.getRoom(''), null);
    assert.strictEqual(roomStore.getRoom(null), null);
  });

  it('authoritatively expires room and clears in-memory state', () => {
    // Create room with negative TTL to simulate past expiration
    const expiredRoom = roomStore.createRoom(-1);
    
    // Add dummy participant and message
    roomStore.addMessage(expiredRoom.roomId, {
      senderId: 'user1',
      userAlias: 'Alice',
      content: 'Hello volatile message'
    });

    // Attempting to get expired room should trigger cleanup and return null
    const result = roomStore.getRoom(expiredRoom.roomId);
    assert.strictEqual(result, null, 'Expired room must be null');
    assert.strictEqual(roomStore.rooms.has(expiredRoom.roomId), false, 'Room must be removed from active Map');
  });

  it('enforces maximum in-memory message bound per room', () => {
    const room = roomStore.createRoom(20);
    for (let i = 0; i < 110; i++) {
      roomStore.addMessage(room.roomId, {
        senderId: 'user1',
        content: `Test message ${i}`
      });
    }

    const activeRoom = roomStore.getRoom(room.roomId);
    assert.ok(activeRoom.messages.length <= 100, 'Messages stored in RAM must not exceed max threshold');
  });

  it('enforces strict P2P person-to-person limit (max 2 participants) and identifies creator', () => {
    const room = roomStore.createRoom(15, 2, 'p2p');
    const u1 = roomStore.addParticipant(room.roomId, 'socket_1', 'user_1', 'Alice');
    const u2 = roomStore.addParticipant(room.roomId, 'socket_2', 'user_2', 'Bob');
    assert.strictEqual(u1.success, true);
    assert.strictEqual(u1.isCreator, true, 'First participant must be identified as Creator');
    assert.strictEqual(u2.success, true);
    assert.strictEqual(u2.isCreator, false, 'Second participant must not be Creator');

    const u3 = roomStore.addParticipant(room.roomId, 'socket_3', 'user_3', 'Eve');
    assert.strictEqual(u3.success, false);
    assert.ok(u3.error.includes('full'), '3rd user in P2P room should be rejected');
  });

  it('enforces strict Group room limit (max 10 participants)', () => {
    const room = roomStore.createRoom(15, 10, 'group');

    // Fill room with 10 participants
    for (let i = 1; i <= 10; i++) {
      const result = roomStore.addParticipant(room.roomId, `socket_${i}`, `user_${i}`, `User${i}`);
      assert.strictEqual(result.success, true, `User ${i} should be allowed to join`);
    }

    // 11th user must be rejected
    const overflow = roomStore.addParticipant(room.roomId, 'socket_11', 'user_11', 'User11');
    assert.strictEqual(overflow.success, false);
    assert.ok(overflow.error.includes('full'), '11th user should receive a room full error');
  });
});
