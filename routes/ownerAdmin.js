const express = require('express');
const crypto = require('crypto');
const { ownerState, recordActivity } = require('../models/OwnerAdmin');

const router = express.Router();

function getAdminKey() {
  return (process.env.ADMIN_KEY || 'ChangeMe123').trim();
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function requireOwnerAccess(req, res, next) {
  const headerKey = String(req.headers['x-admin-key'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearerKey = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const provided = headerKey || bearerKey;

  if (!safeEqual(provided, getAdminKey())) {
    recordActivity('OWNER_UNAUTHORIZED_BLOCKED', req.originalUrl || '/api/owner');
    return res.status(401).json({ ok: false, error: 'Unauthorized: owner access denied' });
  }
  return next();
}

router.use(requireOwnerAccess);

router.get('/overview', (req, res) => {
  recordActivity('OWNER_OVERVIEW_VIEWED');
  res.json({
    ok: true,
    stage: 3,
    profile: ownerState.profile,
    globalSettings: ownerState.globalSettings,
    permissions: ownerState.permissions
  });
});

router.patch('/settings', (req, res) => {
  const { maintenanceMode, allowRegistrations, maxLoginAttempts } = req.body || {};
  if (typeof maintenanceMode === 'boolean') {
    ownerState.globalSettings.maintenanceMode = maintenanceMode;
  }
  if (typeof allowRegistrations === 'boolean') {
    ownerState.globalSettings.allowRegistrations = allowRegistrations;
  }
  if (typeof maxLoginAttempts === 'number' && maxLoginAttempts >= 1 && maxLoginAttempts <= 20) {
    ownerState.globalSettings.maxLoginAttempts = maxLoginAttempts;
  }
  recordActivity('OWNER_SETTINGS_UPDATED', JSON.stringify(ownerState.globalSettings));
  res.json({ ok: true, globalSettings: ownerState.globalSettings });
});

router.patch('/permissions', (req, res) => {
  const allowedKeys = ['manageAdmins', 'managePayments', 'manageAds', 'manageChat', 'manageUsers'];
  for (const key of allowedKeys) {
    if (typeof req.body?.[key] === 'boolean') {
      ownerState.permissions[key] = req.body[key];
    }
  }
  recordActivity('OWNER_PERMISSIONS_UPDATED', JSON.stringify(ownerState.permissions));
  res.json({ ok: true, permissions: ownerState.permissions });
});

router.get('/logs', (req, res) => {
  res.json({ ok: true, logs: ownerState.activityLogs.slice(0, 20) });
});

module.exports = router;
