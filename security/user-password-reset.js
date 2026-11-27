const crypto = require('crypto');

// 8 characters: letters + numbers only
function validateUserPassword(password) {
  if (typeof password !== 'string') {
    return { ok: false, message: 'Password text hona chahiye' };
  }
  if (!/^[A-Za-z0-9]{8}$/.test(password) || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'Password thik 8 character ka ho aur usme alphabet aur number dono hon' };
  }
  return { ok: true };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHex] = storedHash.split(':');
  const testBuf = crypto.scryptSync(password, salt, 64);
  const origBuf = Buffer.from(originalHex, 'hex');
  if (testBuf.length !== origBuf.length) return false;
  return crypto.timingSafeEqual(testBuf, origBuf);
}

// In-memory reset token store (15 min expiry)
const resetTokens = new Map();

function createForgotPasswordCode(userIdentifier) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  if (!key) return { ok: false, message: 'Email ya User ID zaroori hai' };
  const code = String(crypto.randomInt(100000, 999999)); // 6-digit OTP/code
  const expiresAt = Date.now() + 15 * 60 * 1000;
  resetTokens.set(key, { code, expiresAt });
  return { ok: true, user: key, resetCode: code, expiresInMinutes: 15 };
}

function completeForgotPasswordReset(userIdentifier, code, newPassword) {
  const key = String(userIdentifier || '').trim().toLowerCase();
  const record = resetTokens.get(key);
  if (!record) return { ok: false, message: 'Reset request nahi mili' };
  if (Date.now() > record.expiresAt) {
    resetTokens.delete(key);
    return { ok: false, message: 'Reset code expire ho gaya hai' };
  }
  if (String(code || '').trim() !== record.code) {
    return { ok: false, message: 'Galat reset code' };
  }
  const passCheck = validateUserPassword(newPassword);
  if (!passCheck.ok) return { ok: false, message: passCheck.message };

  resetTokens.delete(key);
  return {
    ok: true,
    user: key,
    newPasswordHash: hashPassword(newPassword),
    message: 'Password safaltapoorvak badal gaya hai'
  };
}

module.exports = {
  validateUserPassword,
  hashPassword,
  verifyPassword,
  createForgotPasswordCode,
  completeForgotPasswordReset
};
