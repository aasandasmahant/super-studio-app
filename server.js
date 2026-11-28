require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { URL } = require('url');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

let parsedBaseUrl;
try {
  parsedBaseUrl = new URL(process.env.APP_BASE_URL || `http://127.0.0.1:${PORT}`);
} catch (err) {
  console.error('Invalid APP_BASE_URL, falling back to localhost:', err.message);
  parsedBaseUrl = new URL(`http://127.0.0.1:${PORT}`);
}

const rawAdminHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
const defaultDevHash = crypto.createHash('sha256').update('ChangeMe@123456789').digest('hex');
const adminPasswordHash = rawAdminHash || defaultDevHash;

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    stage: 1,
    service: 'super-studio-app',
    baseUrl: parsedBaseUrl.origin,
    cryptoReady: typeof crypto.randomBytes === 'function',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    stage: 1,
    status: 'server-stable',
    urlOrigin: parsedBaseUrl.origin
  });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password are required' });
  }
  const incomingHash = crypto.createHash('sha256').update(String(password)).digest('hex');
  const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const emailMatch = String(email).trim().toLowerCase() === expectedEmail;
  const passMatch = crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(adminPasswordHash));

  if (!emailMatch || !passMatch) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  return res.json({ ok: true, token });
});

app.post('/api/webhook', (req, res) => {
  const secret = process.env.WEBHOOK_SECRET || '';
  const signature = String(req.headers['x-webhook-signature'] || '');
  const payload = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (!secret || !signature || signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
  }

  return res.json({ ok: true, received: true });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Stage 1 server running at ${parsedBaseUrl.origin}`);
});

if (require.main === module && process.argv.includes('--self-test')) {
  setTimeout(async () => {
    try {
      const healthRes = await fetch(`http://127.0.0.1:${PORT}/health`);
      const healthData = await healthRes.json();
      console.log('Health check:', healthData);
      server.close(() => process.exit(healthRes.ok ? 0 : 1));
    } catch (e) {
      console.error('Self-test failed:', e.message);
      server.close(() => process.exit(1));
    }
  }, 400);
}
