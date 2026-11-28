const express = require('express');
const { userSupportState, createUser, createTicket, sendNotification } = require('../models/UserSupport');

const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    ok: true,
    stage: 7,
    summary: {
      usersCount: userSupportState.users.length,
      openTicketsCount: userSupportState.tickets.filter((t) => t.status === 'open').length,
      notificationsCount: userSupportState.notifications.length,
      logsCount: userSupportState.activityLogs.length
    }
  });
});

router.post('/users', (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required' });
  }
  const user = createUser({ name, email });
  res.status(201).json({ ok: true, user });
});

router.post('/tickets', (req, res) => {
  const { userId, subject, message } = req.body || {};
  if (!subject || !message) {
    return res.status(400).json({ ok: false, error: 'Subject and message are required' });
  }
  const ticket = createTicket({ userId, subject, message });
  res.status(201).json({ ok: true, ticket });
});

router.post('/notifications', (req, res) => {
  const { userId, title, body } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ ok: false, error: 'Title and body are required' });
  }
  const notification = sendNotification({ userId, title, body });
  res.status(201).json({ ok: true, notification });
});

module.exports = router;
