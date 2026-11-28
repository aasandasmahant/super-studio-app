const crypto = require('crypto');

const userSupportState = {
  users: [
    { id: 'usr_1', name: 'Demo User', email: 'user@example.com', verified: true, suspended: false }
  ],
  tickets: [],
  notifications: [],
  activityLogs: []
};

function createUser({ name, email }) {
  const user = {
    id: `usr_${crypto.randomBytes(4).toString('hex')}`,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    verified: false,
    suspended: false,
    createdAt: new Date().toISOString()
  };
  userSupportState.users.unshift(user);
  userSupportState.activityLogs.unshift({
    id: `act_${crypto.randomBytes(4).toString('hex')}`,
    userId: user.id,
    action: 'USER_CREATED',
    at: new Date().toISOString()
  });
  return user;
}

function createTicket({ userId = 'usr_1', subject, message }) {
  const ticket = {
    id: `tkt_${crypto.randomBytes(4).toString('hex')}`,
    userId,
    subject: String(subject).trim(),
    message: String(message).trim(),
    status: 'open',
    createdAt: new Date().toISOString()
  };
  userSupportState.tickets.unshift(ticket);
  return ticket;
}

function sendNotification({ userId = 'all', title, body }) {
  const notif = {
    id: `ntf_${crypto.randomBytes(4).toString('hex')}`,
    userId,
    title: String(title).trim(),
    body: String(body).trim(),
    createdAt: new Date().toISOString()
  };
  userSupportState.notifications.unshift(notif);
  return notif;
}

module.exports = { userSupportState, createUser, createTicket, sendNotification };
