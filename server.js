const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const store = require('./mongo-admin-store');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'yaschat-data.json');

app.use(express.json());
/* STEP_5_JSON_GUARD */
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        communities: Array.isArray(parsed.communities) ? parsed.communities : []
      };
    }
  } catch (_) {}
  return { messages: [], communities: [] };
}

let db = loadDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* STEP_3_AUTH_GUARD */
function getUserFromReq(req) {
  const raw = req.header('x-user-id');
  if (!raw) return null;
  const clean = String(raw).trim().slice(0, 64);
  if (!/^[a-zA-Z0-9_@.-]+$/.test(clean)) return null;
  return { id: clean };
}

function isAdminAuthorized(req) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  const provided = req.header('x-admin-token') || '';
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch (_) {
    return false;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'super-studio-app' });
});

app.get('/api/store', (req, res) => {
  res.json((typeof store.getState === 'function' ? store.getState() : (store || {})));
});

app.post('/api/store/section', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { section, payload } = req.body || {};
  if (!section) {
    return res.status(400).json({ error: 'section is required' });
  }
  const updated = store.updateSection(section, payload);
  res.json({ ok: true, state: updated });
});

app.get('/api/messages', (req, res) => {
  res.json(db.messages);
});

app.post('/api/messages', (req, res) => {
  const { sender, text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const u = getUserFromReq(req);
  const msg = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    sender: sender || (u ? u.id : 'guest'),
    text: String(text).trim(),
    time: Date.now()
  };
  db.messages.push(msg);
  saveDb();
  res.json(msg);
});

app.get('/api/communities', (req, res) => {
  const u = getUserFromReq(req);
  const uid = u ? String(u.id) : 'guest';
  res.json(
    db.communities.map((c) => ({
      id: c.id,
      name: c.name,
      members: c.members,
      joined: Array.isArray(c.joinedBy) && c.joinedBy.includes(uid)
    }))
  );
});

app.post('/api/communities/:id/toggle', (req, res) => {
  const u = getUserFromReq(req);
  const uid = u ? String(u.id) : 'guest';
  const comm = db.communities.find((c) => c.id === req.params.id);
  if (!comm) {
    return res.status(404).json({ error: 'Community not found' });
  }
  comm.joinedBy = Array.isArray(comm.joinedBy) ? comm.joinedBy : [];
  const idx = comm.joinedBy.indexOf(uid);
  if (idx >= 0) {
    comm.joinedBy.splice(idx, 1);
  } else {
    comm.joinedBy.push(uid);
  }
  saveDb();
  res.json({ ok: true, joined: comm.joinedBy.includes(uid), community: comm });
});

app.get('/api/products', (req, res) => {
  const st = store && typeof store.getState === 'function' ? (typeof store.getState === 'function' ? store.getState() : (store || {})) : {};
  const list = Array.isArray(st.products) ? st.products : (Array.isArray(db.products) ? db.products : []);
  res.json(list);
});

app.get('/api/analytics', (req, res) => {
  const st = store && typeof store.getState === 'function' ? (typeof store.getState === 'function' ? store.getState() : (store || {})) : {};
  const productsCount = Array.isArray(st.products) ? st.products.length : (Array.isArray(db.products) ? db.products.length : 0);
  const sharesCount = Array.isArray(db.shares) ? db.shares.length : 0;
  res.json({
    messages: Array.isArray(db.messages) ? db.messages.length : 0,
    communities: Array.isArray(db.communities) ? db.communities.length : 0,
    products: productsCount,
    shares: sharesCount
  });
});

app.post('/api/track-share', (req, res) => {
  const { channel, itemId, label } = req.body || {};
  const u = getUserFromReq(req);
  db.shares = Array.isArray(db.shares) ? db.shares : [];
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    userId: u ? u.id : 'guest',
    channel: channel ? String(channel) : 'direct',
    itemId: itemId ? String(itemId) : '',
    label: label ? String(label) : '',
    time: Date.now()
  };
  db.shares.push(entry);
  saveDb();
  res.json({ ok: true, share: entry });
});

/* STEP_2_DISCOVERY */
try {
  const discMod = require('./modules/product-discovery/server/productDiscoveryRoute.js');
  const discRouter = discMod && (discMod.router || discMod.default || discMod);
  if (typeof discRouter === 'function') {
    app.use('/api/discovery', discRouter);
    app.use('/api/product-discovery', discRouter);
  }
} catch (_) {}

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

/* STEP_4_MONGO_OPTIONAL */
let mongoConnected = false;
if (process.env.MONGODB_URI) {
  try {
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI).then(() => {
      mongoConnected = true;
      console.log('MongoDB connected');
    }).catch((err) => {
      console.warn('MongoDB fallback to JSON store:', err.message);
    });
  } catch (_) {}
}

/* STEP_AUTH_SESSION_API */
const activeSessions = new Map();

function sanitizeUserId(raw) {
  if (!raw) return '';
  const clean = String(raw).trim().slice(0, 64);
  return /^[a-zA-Z0-9_@.-]+$/.test(clean) ? clean : '';
}

app.post('/api/auth/login', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const uid = sanitizeUserId(body.userId || body.username || '');
  if (!uid) {
    return res.status(400).json({ error: 'Valid username or userId required' });
  }
  const role = uid.toLowerCase() === 'admin' ? 'admin' : 'member';
  const token = crypto.randomBytes(24).toString('hex');
  const session = {
    token,
    user: { id: uid, name: uid, role },
    createdAt: Date.now()
  };
  activeSessions.set(token, session);
  return res.json({ ok: true, token, user: session.user });
});

app.get('/api/auth/me', (req, res) => {
  const token = String(req.header('x-session-token') || '').trim();
  if (token && activeSessions.has(token)) {
    const s = activeSessions.get(token);
    return res.json({ authenticated: true, user: s.user });
  }
  const hdrUser = sanitizeUserId(req.header('x-user-id') || '');
  if (hdrUser) {
    return res.json({ authenticated: true, user: { id: hdrUser, name: hdrUser, role: 'member' } });
  }
  return res.json({ authenticated: false, user: null });
});

app.post('/api/auth/logout', (req, res) => {
  const token = String(req.header('x-session-token') || '').trim();
  if (token) activeSessions.delete(token);
  return res.json({ ok: true });
});

/* STEP_STARTER_CATALOG */
const STARTER_PRODUCTS = [
  { id: 'prod-studio-pro', title: 'Super Studio Creator Kit', category: 'Creator Tools', commission: '30%', url: '#product-studio-pro' },
  { id: 'prod-ai-prompts', title: 'Viral Short-Form Prompt Pack', category: 'AI Templates', commission: '30%', url: '#product-ai-prompts' },
  { id: 'prod-audio-beats', title: 'Copyright-Free Beat Bundle', category: 'Music & Audio', commission: '30%', url: '#product-audio-beats' }
];

app.get('/api/products/starter', (req, res) => {
  return res.json({ ok: true, products: STARTER_PRODUCTS });
});

/* STEP_REFERRAL_30_API */
const referralLedger = [];

app.post('/api/referral/commission', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const referrerId = String(body.referrerId || req.header('x-user-id') || 'guest').trim().slice(0, 64);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount required' });
  }
  const rate = 0.30;
  const commission = Number((amount * rate).toFixed(2));
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    referrerId,
    amount: Number(amount.toFixed(2)),
    ratePercent: 30,
    commission,
    note: String(body.note || '').slice(0, 120),
    createdAt: Date.now()
  };
  referralLedger.push(entry);
  return res.json({ ok: true, entry });
});

app.get('/api/referral/summary', (req, res) => {
  const referrerId = String(req.query.referrerId || '').trim();
  const rows = referrerId
    ? referralLedger.filter(r => r.referrerId === referrerId)
    : referralLedger;
  const totalSales = Number(rows.reduce((s, r) => s + r.amount, 0).toFixed(2));
  const totalCommission = Number(rows.reduce((s, r) => s + r.commission, 0).toFixed(2));
  return res.json({
    ok: true,
    ratePercent: 30,
    count: rows.length,
    totalSales,
    totalCommission,
    entries: rows.slice(-20)
  });
});

/* STEP_LANG_API */
const CORE_LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' }
];

app.get('/api/languages', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const list = q
    ? CORE_LANGUAGES.filter(l =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q)
      )
    : CORE_LANGUAGES;
  return res.json({
    ok: true,
    totalSupportedScale: '200+',
    featuredCount: CORE_LANGUAGES.length,
    languages: list
  });
});

/* STEP_ADS_MONETIZATION_API */
const adStats = { impressions: 0, clicks: 0, events: [] };

app.get('/api/ads/config', (req, res) => {
  const st = (typeof store !== 'undefined' && store && typeof store.getState === 'function')
    ? store.getState()
    : (typeof store !== 'undefined' && store ? store : {});
  const customAds = (st && st.DEFAULT_ADMIN_STATE && st.DEFAULT_ADMIN_STATE.adsConfig) || st.adsConfig || {};
  return res.json({
    ok: true,
    enabled: true,
    slots: {
      topBanner: { id: 'ad-top-banner', enabled: true, network: customAds.network || 'fallback' },
      inlineFeed: { id: 'ad-inline-feed', enabled: true, network: customAds.network || 'fallback' }
    },
    stats: { impressions: adStats.impressions, clicks: adStats.clicks }
  });
});

app.post('/api/ads/event', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const type = String(body.type || '').trim().toLowerCase();
  if (type !== 'impression' && type !== 'click') {
    return res.status(400).json({ error: 'type must be impression or click' });
  }
  if (type === 'impression') adStats.impressions += 1;
  if (type === 'click') adStats.clicks += 1;
  const ev = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type,
    slotId: String(body.slotId || 'default').slice(0, 64),
    at: Date.now()
  };
  adStats.events.push(ev);
  if (adStats.events.length > 50) adStats.events.shift();
  return res.json({ ok: true, event: ev, stats: { impressions: adStats.impressions, clicks: adStats.clicks } });
});

/* STEP_NOTIFICATIONS_API */
const notificationsFeed = [
  { id: 'notif-welcome', title: 'Welcome to Super Studio', message: 'Core APIs and helpers are active.', createdAt: Date.now() }
];

app.get('/api/notifications', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  return res.json({ ok: true, count: notificationsFeed.length, notifications: notificationsFeed.slice(-limit) });
});

app.post('/api/notifications', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const title = String(body.title || '').trim().slice(0, 100);
  const message = String(body.message || '').trim().slice(0, 300);
  if (!title && !message) {
    return res.status(400).json({ error: 'title or message required' });
  }
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: title || 'Update',
    message,
    createdAt: Date.now()
  };
  notificationsFeed.push(item);
  if (notificationsFeed.length > 100) notificationsFeed.shift();
  return res.json({ ok: true, notification: item });
});

/* STEP_AFFILIATE_FEED_API */
const affiliateLinks = [
  { id: 'aff-1', network: 'ClickBank', title: 'Creator Toolkit Offer', url: 'https://www.clickbank.com', commissionPercent: 30 },
  { id: 'aff-2', network: 'ShareASale', title: 'Digital Studio Partner', url: 'https://www.shareasale.com', commissionPercent: 30 }
];

function isSafeHttpUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (_) {
    return false;
  }
}

app.get('/api/affiliate/config', (req, res) => {
  return res.json({
    ok: true,
    networks: ['ClickBank', 'ShareASale', 'Digistore24', 'Flipkart'],
    defaultCommissionPercent: 30,
    links: affiliateLinks
  });
});

app.post('/api/affiliate/link', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const title = String(body.title || '').trim().slice(0, 100);
  const network = String(body.network || 'Custom').trim().slice(0, 40);
  const url = String(body.url || '').trim().slice(0, 400);
  if (!title || !isSafeHttpUrl(url)) {
    return res.status(400).json({ error: 'Valid title and http/https url required' });
  }
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    network,
    title,
    url,
    commissionPercent: 30,
    createdAt: Date.now()
  };
  affiliateLinks.push(item);
  if (affiliateLinks.length > 100) affiliateLinks.shift();
  return res.json({ ok: true, link: item });
});

/* STEP_SECURITY_RATE_MONITOR */
const rateBucket = new Map();

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/api', (req, res, next) => {
  const ip = String(req.ip || req.socket?.remoteAddress || 'local');
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 120;
  let rec = rateBucket.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + windowMs };
    rateBucket.set(ip, rec);
  }
  rec.count += 1;
  if (rec.count > maxReq) {
    return res.status(429).json({ error: 'Too many requests, please retry shortly' });
  }
  next();
});

app.get('/api/status', (req, res) => {
  const mem = process.memoryUsage();
  return res.json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    memoryMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
    modules: {
      auth: true,
      starterCatalog: true,
      referral30: true,
      languages: true,
      ads: true,
      notifications: true,
      affiliate: true,
      rateLimit: true
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
