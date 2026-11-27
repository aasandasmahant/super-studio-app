const express = require('express');
const router = express.Router();
const {
  validateUserPassword,
  hashPassword,
  verifyPassword,
  createForgotPasswordCode,
  completeForgotPasswordReset
} = require('../security/user-password-reset');

// Simple local fallback user map if DB is not yet wired
const localUsers = new Map();

router.post('/api/user/set-password', (req, res) => {
  const { userId, password } = req.body || {};
  const id = String(userId || '').trim().toLowerCase();
  if (!id) return res.status(400).json({ ok: false, message: 'User ID ya Email zaroori hai' });
  const check = validateUserPassword(password);
  if (!check.ok) return res.status(400).json({ ok: false, message: check.message });
  localUsers.set(id, { passwordHash: hashPassword(password) });
  return res.json({ ok: true, message: 'User password set ho gaya' });
});

router.post('/api/user/login', (req, res) => {
  const { userId, password } = req.body || {};
  const id = String(userId || '').trim().toLowerCase();
  const user = localUsers.get(id);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ ok: false, message: 'Galat User ID ya Password' });
  }
  return res.json({ ok: true, message: 'User login safal' });
});

router.post('/api/user/forgot-password', (req, res) => {
  const { userId } = req.body || {};
  const result = createForgotPasswordCode(userId);
  if (!result.ok) return res.status(400).json(result);
  // Production mein ise Email/SMS se bhejen; abhi testing ke liye response mein dikhaya gaya hai
  return res.json({ ok: true, message: 'Reset code taiyar hai', resetCode: result.resetCode, expiresInMinutes: result.expiresInMinutes });
});

router.post('/api/user/reset-password', (req, res) => {
  const { userId, code, newPassword } = req.body || {};
  const result = completeForgotPasswordReset(userId, code, newPassword);
  if (!result.ok) return res.status(400).json(result);
  localUsers.set(result.user, { passwordHash: result.newPasswordHash });
  return res.json({ ok: true, message: result.message });
});

module.exports = router;
