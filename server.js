const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const LANG_210_LIST = Array.from({ length: 210 }, (_, i) => {
  const idx = i + 1;
  const presets = {
    1: { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    2: { code: 'en', name: 'English', native: 'English' },
    3: { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    4: { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    5: { code: 'mr', name: 'Marathi', native: 'मराठी' },
    6: { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    7: { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    8: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    9: { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    10: { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    11: { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
    12: { code: 'es', name: 'Spanish', native: 'Español' },
    13: { code: 'fr', name: 'French', native: 'Français' },
    14: { code: 'de', name: 'German', native: 'Deutsch' },
    15: { code: 'ar', name: 'Arabic', native: 'العربية' }
  };
  return presets[idx] || { code: 'l' + String(idx).padStart(3, '0'), name: 'Language ' + idx, native: 'Lang-' + idx };
});

const STARTER_PRODUCTS = [
  { id: 'prod-01', title: 'Creator Studio Starter Pack', price: 499, referralRate: 0.30, tag: 'Starter' },
  { id: 'prod-02', title: 'Live Chat & Community Pro', price: 999, referralRate: 0.30, tag: 'Popular' },
  { id: 'prod-03', title: 'Global Language & Media Suite', price: 1499, referralRate: 0.30, tag: 'Pro' }
];

const STUDIO_NOTIFICATIONS = [];
const STUDIO_AFFILIATE_CLICKS = [];
const STUDIO_SESSIONS = new Map();
const STUDIO_WEBHOOK_EVENTS = [];
const STUDIO_CHAT_MESSAGES = [];
const STUDIO_WEBRTC_SIGNALS = [];

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(html);
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString('utf8');
      if (raw.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const STUDIO_CONTROLS_HTML = `<!doctype html>
<html lang="hi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Super Studio Controls</title></head>
<body style="margin:0;padding:16px;background:#090d16;color:#f9fafb;font-family:sans-serif;">
  <div style="max-width:720px;margin:auto;padding:14px;border:1px solid #2d3748;border-radius:10px;background:#111827;">
    <h2 style="margin:0 0 10px 0;font-size:18px;">Super Studio Controls</h2>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button type="button" onclick="callApi('/api/languages/all','GET')">200+ Langs</button>
      <button type="button" onclick="callApi('/api/products','GET')">Starter Products</button>
      <button type="button" onclick="callApi('/api/notifications','POST',{title:'Alert',message:'Studio active'})">Send Alert</button>
      <button type="button" onclick="callApi('/api/affiliate/track','POST',{partner:'studio',ref:'YAS30',amount:1000})">Track 30% Aff</button>
      <button type="button" onclick="callApi('/api/session/login','POST',{username:'aasan'})">Session Login</button>
      <button type="button" onclick="callApi('/api/chat/messages','POST',{room:'lobby',sender:'aasan',text:'Hello studio'})">Send Chat</button>
      <button type="button" onclick="callApi('/api/payment/webhook','POST',{event:'payment.completed',orderId:'ord_101',amount:999})">Test Webhook</button>
    </div>
    <pre id="out" style="margin-top:12px;padding:10px;background:#030712;border-radius:6px;overflow:auto;max-height:220px;">Ready.</pre>
  </div>
  <script>
    async function callApi(url, method, body) {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      const d = await r.json();
      document.getElementById('out').textContent = JSON.stringify(d, null, 2);
    }
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = (req.method || 'GET').toUpperCase();

  if (pathname === '/' || pathname === '/studio-controls') {
    return sendHtml(res, 200, STUDIO_CONTROLS_HTML);
  }

  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, 200, { ok: true, status: 'healthy' });
  }

  if (pathname === '/api/system/status' && method === 'GET') {
    const hasMongoUri = Boolean(process.env.MONGODB_URI && String(process.env.MONGODB_URI).trim());
    return sendJson(res, 200, {
      ok: true,
      service: 'super-studio-app',
      uptimeSec: Math.floor(process.uptime()),
      mongoConfigured: hasMongoUri,
      timestamp: Date.now()
    });
  }

  if (pathname === '/api/languages/all' && method === 'GET') {
    return sendJson(res, 200, { ok: true, total: LANG_210_LIST.length, languages: LANG_210_LIST });
  }

  if (pathname === '/api/translate' && method === 'POST') {
    const body = await readJsonBody(req);
    const text = String(body.text || '').trim();
    const target = String(body.target || 'hi').trim();
    if (!text) return sendJson(res, 400, { ok: false, error: 'text is required' });
    return sendJson(res, 200, { ok: true, sourceText: text, target, translatedText: `[${target}] ${text}` });
  }

  if (pathname === '/api/media/upload' && method === 'POST') {
    const body = await readJsonBody(req);
    const filename = path.basename(String(body.filename || 'upload.bin')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const b64 = String(body.base64Data || '');
    const buf = Buffer.from(b64, 'base64');
    const savedName = `${Date.now()}_${filename}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, savedName), buf);
    return sendJson(res, 200, { ok: true, file: savedName, bytes: buf.length });
  }

  if (pathname === '/api/media/list' && method === 'GET') {
    const files = fs.readdirSync(UPLOAD_DIR);
    return sendJson(res, 200, { ok: true, count: files.length, files });
  }

  if (pathname === '/api/products' && method === 'GET') {
    const items = STARTER_PRODUCTS.map((p) => ({
      ...p,
      referralCommission: Number((p.price * p.referralRate).toFixed(2))
    }));
    return sendJson(res, 200, { ok: true, count: items.length, products: items });
  }

  if (pathname === '/api/referral/calc' && method === 'POST') {
    const body = await readJsonBody(req);
    const prod = STARTER_PRODUCTS.find((p) => p.id === String(body.productId || '').trim()) || STARTER_PRODUCTS[0];
    const qty = Math.max(1, Math.min(100, Number(body.qty || 1) || 1));
    const subtotal = prod.price * qty;
    const commission30 = Number((subtotal * 0.30).toFixed(2));
    return sendJson(res, 200, { ok: true, productId: prod.id, qty, subtotal, commissionRate: '30%', commission30 });
  }

  if (pathname === '/api/notifications' && method === 'GET') {
    return sendJson(res, 200, { ok: true, count: STUDIO_NOTIFICATIONS.length, notifications: STUDIO_NOTIFICATIONS.slice(-25) });
  }

  if (pathname === '/api/notifications' && method === 'POST') {
    const body = await readJsonBody(req);
    const message = String(body.message || '').trim().slice(0, 300);
    if (!message) return sendJson(res, 400, { ok: false, error: 'message is required' });
    const item = {
      id: 'notif-' + Date.now(),
      title: String(body.title || 'Studio Alert').trim().slice(0, 100),
      message,
      createdAt: Date.now()
    };
    STUDIO_NOTIFICATIONS.push(item);
    return sendJson(res, 200, { ok: true, notification: item });
  }

  if (pathname === '/api/affiliate/track' && method === 'POST') {
    const body = await readJsonBody(req);
    const amount = Math.max(0, Math.min(1000000, Number(body.amount || 0) || 0));
    const commission30 = Number((amount * 0.30).toFixed(2));
    const event = {
      id: 'aff-' + Date.now(),
      partner: String(body.partner || 'direct').trim().slice(0, 40),
      ref: String(body.ref || 'YAS30').trim().slice(0, 40),
      amount,
      commission30,
      trackedAt: Date.now()
    };
    STUDIO_AFFILIATE_CLICKS.push(event);
    return sendJson(res, 200, { ok: true, tracked: event, totalEvents: STUDIO_AFFILIATE_CLICKS.length });
  }

  if (pathname === '/api/session/login' && method === 'POST') {
    const body = await readJsonBody(req);
    const username = String(body.username || 'creator').trim().slice(0, 50) || 'creator';
    const token = 'sess_' + Buffer.from(username + ':' + Date.now()).toString('base64url').slice(0, 24);
    const session = { token, username, role: 'creator', createdAt: Date.now() };
    STUDIO_SESSIONS.set(token, session);
    return sendJson(res, 200, { ok: true, session });
  }

  if (pathname === '/api/session/me' && method === 'GET') {
    const token = String(req.headers['x-session-token'] || parsedUrl.searchParams.get('token') || '').trim();
    const session = STUDIO_SESSIONS.get(token) || null;
    return sendJson(res, 200, { ok: Boolean(session), authenticated: Boolean(session), session });
  }

  if (pathname === '/api/payment/webhook' && method === 'POST') {
    const body = await readJsonBody(req);
    const amount = Math.max(0, Number(body.amount || 0) || 0);
    const entry = {
      id: 'wh_' + Date.now(),
      eventType: String(body.event || body.type || 'payment.completed').trim().slice(0, 60),
      orderId: String(body.orderId || ('ord_' + Date.now())).trim().slice(0, 60),
      amount,
      commission30: Number((amount * 0.30).toFixed(2)),
      receivedAt: Date.now()
    };
    STUDIO_WEBHOOK_EVENTS.push(entry);
    return sendJson(res, 200, { ok: true, webhook: entry, totalEvents: STUDIO_WEBHOOK_EVENTS.length });
  }

  if (pathname === '/api/chat/messages' && method === 'GET') {
    const room = String(parsedUrl.searchParams.get('room') || 'general').trim().slice(0, 50) || 'general';
    const messages = STUDIO_CHAT_MESSAGES.filter((m) => m.room === room).slice(-50);
    return sendJson(res, 200, { ok: true, room, count: messages.length, messages });
  }

  if (pathname === '/api/chat/messages' && method === 'POST') {
    const body = await readJsonBody(req);
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return sendJson(res, 400, { ok: false, error: 'text is required' });
    const message = {
      id: 'msg_' + Date.now(),
      room: String(body.room || 'general').trim().slice(0, 50) || 'general',
      sender: String(body.sender || 'guest').trim().slice(0, 50) || 'guest',
      text,
      createdAt: Date.now()
    };
    STUDIO_CHAT_MESSAGES.push(message);
    return sendJson(res, 200, { ok: true, message });
  }

  if (pathname === '/api/webrtc/signal' && method === 'GET') {
    const room = String(parsedUrl.searchParams.get('room') || 'call-room').trim().slice(0, 50) || 'call-room';
    const signals = STUDIO_WEBRTC_SIGNALS.filter((s) => s.room === room).slice(-30);
    return sendJson(res, 200, { ok: true, room, count: signals.length, signals });
  }

  if (pathname === '/api/webrtc/signal' && method === 'POST') {
    const body = await readJsonBody(req);
    const signal = {
      id: 'sig_' + Date.now(),
      room: String(body.room || 'call-room').trim().slice(0, 50) || 'call-room',
      from: String(body.from || 'peer-a').trim().slice(0, 50) || 'peer-a',
      type: String(body.type || 'offer').trim().slice(0, 30) || 'offer',
      payload: body.payload !== undefined ? body.payload : {},
      createdAt: Date.now()
    };
    STUDIO_WEBRTC_SIGNALS.push(signal);
    return sendJson(res, 200, { ok: true, signal });
  }

  if (pathname === '/api/affiliate/summary' && method === 'GET') {
    const totalAmount = STUDIO_AFFILIATE_CLICKS.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalCommission30 = Number((totalAmount * 0.30).toFixed(2));
    return sendJson(res, 200, {
      ok: true,
      totalClicks: STUDIO_AFFILIATE_CLICKS.length,
      totalAmount: Number(totalAmount.toFixed(2)),
      commissionRate: '30%',
      totalCommission30,
      recentEvents: STUDIO_AFFILIATE_CLICKS.slice(-10)
    });
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('SERVER_RUNNING_PORT:' + PORT);
});
