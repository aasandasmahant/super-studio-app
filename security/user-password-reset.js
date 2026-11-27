const crypto = require('crypto');

function hasSequentialDigits(str) {
  const digits = str.replace(/[^0-9]/g, '');
  for (let i = 0; i <= digits.length - 4; i++) {
    const a = Number(digits[i]);
    const b = Number(digits[i + 1]);
    const c = Number(digits[i + 2]);
    const d = Number(digits[i + 3]);
    if (b - a === 1 && c - b === 1 && d - c === 1) return true;
    if (a - b === 1 && b - c === 1 && c - d === 1) return true;
    if (a === b && b === c && c === d) return true;
  }
  return false;
}

// Capital + Small alphabets + high-entropy numbers (min 10 chars)
function validateHighTechAlphaNumPassword(password) {
  if (typeof password !== 'string') {
    return { ok: false, message: 'Password text hona chahiye' };
  }
  if (password.length < 10) {
    return { ok: false, message: 'Password kam se kam 10 character ka hona chahiye' };
  }
  if (!/^[A-Za-z0-9]+$/.test(password)) {
    return { ok: false, message: 'Keval Capital, Small alphabet aur Numbers ka istemal karein' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'Kam se kam 1 Capital letter (A-Z) zaroori hai' };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'Kam se kam 1 Small letter (a-z) zaroori hai' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Kam se kam 1 Number (0-9) zaroori hai' };
  }
  if (hasSequentialDigits(password)) {
    return { ok: false, message: '1234, 4321 ya 1111 jaise aasan/kramik number na rakhein' };
  }
  const lower = password.toLowerCase();
  const blocked = ['2025', '2026', 'abcd', 'qwerty', 'password', 'admin'];
  if (blocked.some((b) => lower.includes(b))) {
    return { ok: false, message: 'Aasan ya aam shabd/saal (jaise 2026, abcd, admin) na rakhein' };
  }
  return { ok: true, message: 'High-tech password verified' };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || !storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHex] = storedHash.split(':');
  const testBuf = crypto.scryptSync(password, salt, 64);
  const origBuf = Buffer.from(originalHex, 'hex');
  if (testBuf.length !== origBuf.length) return false;
  return crypto.timingSafeEqual(testBuf, origBuf);
}

const resetTokens = new Map();
const loginAttempts = new Map();
const sessions = new Map();

function checkLoginAllowed(userIdentifier) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  const entry = loginAttempts.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockUntil && Date.now() < entry.lockUntil) {
    const minsLeft = Math.ceil((entry.lockUntil - Date.now()) / 60000);
    return { allowed: false, message: `Bahut baar galat koshish hui. ${minsLeft} minute baad try karein` };
  }
  if (entry.lockUntil && Date.now() >= entry.lockUntil) {
    loginAttempts.delete(key);
  }
  return { allowed: true };
}

function recordFailedLogin(userIdentifier) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  const entry = loginAttempts.get(key) || { fails: 0, lockUntil: 0 };
  entry.fails += 1;
  if (entry.fails >= 5) {
    entry.lockUntil = Date.now() + 15 * 60 * 1000;
    entry.fails = 0;
  }
  loginAttempts.set(key, entry);
  return entry;
}

function clearLoginAttempts(userIdentifier) {
  loginAttempts.delete(String(userIdentifier || '').trim().toLowerCase());
}

function createSessionToken(userIdentifier) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  sessions.set(token, { user: key, expiresAt });
  return { token, expiresAt };
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return { valid: false };
  const rec = sessions.get(token);
  if (!rec) return { valid: false };
  if (Date.now() > rec.expiresAt) {
    sessions.delete(token);
    return { valid: false };
  }
  return { valid: true, user: rec.user };
}

function createForgotPasswordCode(userIdentifier) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  if (!key) return { ok: false, message: 'Email ya User ID zaroori hai' };
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  resetTokens.set(key, { code, expiresAt, wrongTries: 0 });
  return { ok: true, user: key, resetCode: code, expiresInMinutes: 5 };
}

function completeForgotPasswordReset(userIdentifier, code, newPassword) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  const record = resetTokens.get(key);
  if (!record) return { ok: false, message: 'Reset request nahi mili ya expire ho gayi' };
  if (Date.now() > record.expiresAt) {
    resetTokens.delete(key);
    return { ok: false, message: 'Reset code expire ho gaya hai' };
  }
  const inputCode = String(code || '').trim();
  const match = inputCode.length === record.code.length &&
    crypto.timingSafeEqual(Buffer.from(inputCode), Buffer.from(record.code));
  if (!match) {
    record.wrongTries += 1;
    if (record.wrongTries >= 3) {
      resetTokens.delete(key);
      return { ok: false, message: '3 baar galat code par OTP radd kar diya gaya hai' };
    }
    resetTokens.set(key, record);
    return { ok: false, message: 'Galat reset code' };
  }
  const passCheck = validateHighTechAlphaNumPassword(newPassword);
  if (!passCheck.ok) return { ok: false, message: passCheck.message };

  resetTokens.delete(key);
  clearLoginAttempts(key);
  return {
    ok: true,
    user: key,
    newPasswordHash: hashPassword(newPassword),
    message: 'Password safaltapoorvak badal gaya hai'
  };
}

module.exports = {
  validateHighTechAlphaNumPassword,
  validateStrongProPassword: validateHighTechAlphaNumPassword,
  validateUserPassword: validateHighTechAlphaNumPassword,
  hashPassword,
  verifyPassword,
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
  createSessionToken,
  verifySessionToken,
  createForgotPasswordCode,
  completeForgotPasswordReset
};
