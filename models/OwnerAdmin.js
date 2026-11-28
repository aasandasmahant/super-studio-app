const crypto = require('crypto');

const ownerState = {
  profile: {
    name: 'Owner Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase(),
    role: 'owner',
    mfaEnabled: true
  },
  globalSettings: {
    maintenanceMode: false,
    allowRegistrations: true,
    maxLoginAttempts: 5
  },
  permissions: {
    manageAdmins: true,
    managePayments: true,
    manageAds: true,
    manageChat: true,
    manageUsers: true
  },
  activityLogs: []
};

function recordActivity(action, detail = '') {
  ownerState.activityLogs.unshift({
    id: crypto.randomBytes(6).toString('hex'),
    action,
    detail,
    at: new Date().toISOString()
  });
  if (ownerState.activityLogs.length > 50) {
    ownerState.activityLogs.length = 50;
  }
}

module.exports = { ownerState, recordActivity };
