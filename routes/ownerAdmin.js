const express = require('express');
const { ownerState, recordActivity } = require('../models/OwnerAdmin');

const router = express.Router();

router.get('/overview', (req, res) => {
  recordActivity('OWNER_OVERVIEW_VIEWED');
  res.json({
    ok: true,
    stage: 3,
    profile: ownerState.profile,
    globalSettings: ownerState.globalSettings,
    permissions: ownerState.permissions,
    activityCount: ownerState.activityLogs.length
  });
});

router.patch('/settings', (req, res) => {
  const { maintenanceMode, allowRegistrations, maxLoginAttempts } = req.body || {};
  if (typeof maintenanceMode === 'boolean') ownerState.globalSettings.maintenanceMode = maintenanceMode;
  if (typeof allowRegistrations === 'boolean') ownerState.globalSettings.allowRegistrations = allowRegistrations;
  if (Number.isInteger(maxLoginAttempts) && maxLoginAttempts >= 1 && maxLoginAttempts <= 20) {
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
