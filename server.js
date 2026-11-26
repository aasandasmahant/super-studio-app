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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
