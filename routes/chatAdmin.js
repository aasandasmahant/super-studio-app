const express = require('express');
const { chatState, createRoom, addMessage, setUserAction } = require('../models/ChatAdmin');

const router = express.Router();

router.get('/analytics', (req, res) => {
  res.json({
    ok: true,
    stage: 6,
    analytics: {
      roomsCount: chatState.rooms.length,
      messagesCount: chatState.messages.length,
      mutedOrBannedCount: chatState.mutedOrBannedUsers.length,
      reportsCount: chatState.reportedMessages.length
    }
  });
});

router.post('/rooms', (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ ok: false, error: 'Room name is required' });
  }
  const room = createRoom({ name });
  res.status(201).json({ ok: true, room });
});

router.post('/messages', (req, res) => {
  const { roomId, userId, text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ ok: false, error: 'Message text is required' });
  }
  const message = addMessage({ roomId, userId, text });
  res.status(201).json({ ok: true, message });
});

router.post('/moderate', (req, res) => {
  const { userId, action, reason } = req.body || {};
  if (!userId || !String(userId).trim()) {
    return res.status(400).json({ ok: false, error: 'userId is required' });
  }
  const entry = setUserAction({ userId, action, reason });
  res.status(201).json({ ok: true, moderation: entry });
});

module.exports = router;
