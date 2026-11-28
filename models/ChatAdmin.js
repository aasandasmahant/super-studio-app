const crypto = require('crypto');

const chatState = {
  rooms: [
    { id: 'room_general', name: 'General Lounge', locked: false, createdAt: new Date().toISOString() }
  ],
  messages: [],
  mutedOrBannedUsers: [],
  reportedMessages: []
};

function createRoom({ name }) {
  const room = {
    id: `room_${crypto.randomBytes(4).toString('hex')}`,
    name: String(name).trim(),
    locked: false,
    createdAt: new Date().toISOString()
  };
  chatState.rooms.push(room);
  return room;
}

function addMessage({ roomId = 'room_general', userId = 'user_1', text }) {
  const msg = {
    id: `msg_${crypto.randomBytes(5).toString('hex')}`,
    roomId,
    userId,
    text: String(text).trim(),
    flagged: false,
    hidden: false,
    createdAt: new Date().toISOString()
  };
  chatState.messages.unshift(msg);
  return msg;
}

function setUserAction({ userId, action = 'mute', reason = 'moderation' }) {
  const entry = {
    id: `mod_${crypto.randomBytes(4).toString('hex')}`,
    userId: String(userId).trim(),
    action: action === 'ban' ? 'ban' : 'mute',
    reason,
    createdAt: new Date().toISOString()
  };
  chatState.mutedOrBannedUsers.unshift(entry);
  return entry;
}

module.exports = { chatState, createRoom, addMessage, setUserAction };
