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

/* STEP_P1_JSON_PERSISTENCE */
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStoreData() {
  try {
    if (!fs.existsSync(STORE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

const initialStore = loadStoreData() || {};
STUDIO_NOTIFICATIONS = Array.isArray(initialStore.notifications) ? initialStore.notifications : [];
STUDIO_AFFILIATE_CLICKS = Array.isArray(initialStore.affiliateClicks) ? initialStore.affiliateClicks : [];
STUDIO_SESSIONS = new Map(Array.isArray(initialStore.sessions) ? initialStore.sessions : []);
STUDIO_WEBHOOK_EVENTS = Array.isArray(initialStore.webhookEvents) ? initialStore.webhookEvents : [];
STUDIO_CHAT_MESSAGES = Array.isArray(initialStore.chatMessages) ? initialStore.chatMessages : [];
const STUDIO_WEBRTC_SIGNALS = Array.isArray(initialStore.webrtcSignals) ? initialStore.webrtcSignals : [];

function saveStoreData() {
  try {
    const payload = {
      notifications: STUDIO_NOTIFICATIONS.slice(-100),
      affiliateClicks: STUDIO_AFFILIATE_CLICKS.slice(-200),
      sessions: Array.from(STUDIO_SESSIONS.entries()).slice(-100),
      webhookEvents: STUDIO_WEBHOOK_EVENTS.slice(-100),
      chatMessages: STUDIO_CHAT_MESSAGES.slice(-200),
      webrtcSignals: STUDIO_WEBRTC_SIGNALS.slice(-100),
      updatedAt: Date.now()
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload), 'utf8');
  } catch {}
}
const RATE_BUCKETS = new Map();

/* STEP_P3_ADMIN_AUTH_HELPERS */
function getExpectedAdminSecret() {
  const envSecret = String(process.env.ADMIN_SECRET || '').trim();
  return envSecret || 'super-studio-owner-dev-key';
}

function createAdminToken(role = 'owner') {
  const token = crypto.randomBytes(24).toString('hex');
  const session = {
    token,
    role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  if (typeof STUDIO_SESSIONS !== 'undefined' && STUDIO_SESSIONS && typeof STUDIO_SESSIONS.set === 'function') {
    STUDIO_SESSIONS.set(token, session);
    if (typeof saveStoreData === 'function') saveStoreData();
  }
  return session;
}

function verifyAdminRequest(req) {
  const authHeader = String(req.headers['authorization'] || '').trim();
  const xAdminToken = String(req.headers['x-admin-token'] || '').trim();
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const token = xAdminToken || bearerToken;
  if (!token || typeof STUDIO_SESSIONS === 'undefined' || !STUDIO_SESSIONS || typeof STUDIO_SESSIONS.get !== 'function') {
    return { ok: false, role: null };
  }
  const session = STUDIO_SESSIONS.get(token);
  if (!session || Number(session.expiresAt || 0) < Date.now()) {
    return { ok: false, role: null };
  }
  return { ok: true, role: session.role || 'owner' };
}

/* STEP_P4_PRODUCT_ADAPTER */
const STUDIO_CUSTOM_PRODUCTS = Array.isArray(initialStore && initialStore.customProducts) ? initialStore.customProducts : [];

function getProductProviderStatus() {
  return {
    clickbankConfigured: Boolean(String(process.env.CLICKBANK_API_KEY || '').trim()),
    shareasaleConfigured: Boolean(String(process.env.SHAREASALE_API_TOKEN || '').trim()),
    customCatalogCount: STUDIO_CUSTOM_PRODUCTS.length
  };
}

/* STEP_P5_REVIEWS_VERDICT */
const STUDIO_PRODUCT_VERDICTS = (initialStore && typeof initialStore.productVerdicts === 'object' && initialStore.productVerdicts !== null)
  ? initialStore.productVerdicts
  : {};

function buildAiVerdictSummary(ratingAvg = 0, prosCount = 0, consCount = 0, explicitVerdict = '') {
  const norm = String(explicitVerdict || '').trim().toLowerCase();
  if (['buy', 'caution', 'avoid'].includes(norm)) return norm;
  const score = Number(ratingAvg || 0) + (prosCount * 0.25) - (consCount * 0.35);
  if (score >= 4.0) return 'buy';
  if (score >= 2.5) return 'caution';
  return 'avoid';
}

/* STEP_P6_COMMUNITY_MODERATION */
const STUDIO_MODERATION_REPORTS = Array.isArray(initialStore && initialStore.moderationReports)
  ? initialStore.moderationReports
  : [];

/* STEP_P7_AFFILIATE_TRACKING */
const STUDIO_AFFILIATE_CLICKS_LIST = Array.isArray(initialStore && initialStore.affiliateClicksList)
  ? initialStore.affiliateClicksList
  : [];

/* STEP_P8_TRANSLATION_HELPER */
const STUDIO_LANGUAGES = (typeof SUPPORTED_LANGUAGES !== 'undefined' && Array.isArray(SUPPORTED_LANGUAGES) && SUPPORTED_LANGUAGES.length > 0)
  ? SUPPORTED_LANGUAGES
  : ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'id', 'th', 'vi', 'tr', 'it', 'nl', 'pl', 'uk'];

function getTranslationProviderConfig() {
  return {
    providerUrl: String(process.env.LIBRETRANSLATE_URL || '').trim(),
    apiKeyConfigured: Boolean(String(process.env.TRANSLATE_API_KEY || '').trim()),
    languageCount: STUDIO_LANGUAGES.length
  };
}

/* STEP_P9_ADS_ANALYTICS */
const STUDIO_AD_EVENTS = Array.isArray(initialStore && initialStore.adEvents)
  ? initialStore.adEvents
  : [];

function getAdsConfigSummary() {
  return {
    adsEnabled: String(process.env.ADS_ENABLED || 'false').trim().toLowerCase() === 'true',
    adSlotBannerEnabled: true,
    consentRequired: true,
    totalEvents: STUDIO_AD_EVENTS.length
  };
}

function checkRateLimit(ipKey) {
  const now = Date.now();
  const windowMs = 60000;
  const maxReq = 120;
  const rec = RATE_BUCKETS.get(ipKey) || { count: 0, resetAt: now + windowMs };
  if (now > rec.resetAt) {
    rec.count = 0;
    rec.resetAt = now + windowMs;
  }
  rec.count += 1;
  RATE_BUCKETS.set(ipKey, rec);
  return rec.count <= maxReq;
}

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

/* STEP_P1_RATE_LIMIT_AND_WEBHOOK_SEC */
const server = http.createServer(async (req, res) => {
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  if (!checkRateLimit(clientIp)) {
    return sendJson(res, 429, { ok: false, error: 'Too many requests' });
  }
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
      storageMode: hasMongoUri ? 'mongodb-uri-configured' : 'json-file-store',
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
    STUDIO_NOTIFICATIONS.push(item); saveStoreData();
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
    STUDIO_AFFILIATE_CLICKS.push(event); saveStoreData();
    return sendJson(res, 200, { ok: true, tracked: event, totalEvents: STUDIO_AFFILIATE_CLICKS.length });
  }

  if (pathname === '/api/session/login' && method === 'POST') {
    const body = await readJsonBody(req);
    const username = String(body.username || 'creator').trim().slice(0, 50) || 'creator';
    const token = 'sess_' + Buffer.from(username + ':' + Date.now()).toString('base64url').slice(0, 24);
    const session = { token, username, role: 'creator', createdAt: Date.now() };
    STUDIO_SESSIONS.set(token, session); saveStoreData();
    return sendJson(res, 200, { ok: true, session });
  }

  if (pathname === '/api/session/me' && method === 'GET') {
    const token = String(req.headers['x-session-token'] || parsedUrl.searchParams.get('token') || '').trim();
    const session = STUDIO_SESSIONS.get(token) || null;
    return sendJson(res, 200, { ok: Boolean(session), authenticated: Boolean(session), session });
  }

  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await readJsonBody(req);
    const providedSecret = String(body.secret || body.password || '').trim();
    const expectedSecret = getExpectedAdminSecret();
    if (!providedSecret || providedSecret !== expectedSecret) {
      return sendJson(res, 401, { ok: false, error: 'Invalid admin credentials' });
    }
    const requestedRole = String(body.role || 'owner').trim() || 'owner';
    const session = createAdminToken(requestedRole);
    return sendJson(res, 200, {
      ok: true,
      token: session.token,
      role: session.role,
      expiresAt: session.expiresAt
    });
  }

  if (pathname === '/api/products/catalog' && method === 'GET') {
    const q = String(urlObj.searchParams.get('q') || '').trim().toLowerCase();
    const band = String(urlObj.searchParams.get('band') || '').trim().toLowerCase();
    let items = STUDIO_CUSTOM_PRODUCTS.slice();
    if (q) {
      items = items.filter((p) =>
        String(p.title || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }
    if (band && ['low', 'medium', 'high'].includes(band)) {
      items = items.filter((p) => String(p.priceBand || '').toLowerCase() === band);
    }
    return sendJson(res, 200, {
      ok: true,
      providers: getProductProviderStatus(),
      total: items.length,
      products: items
    });
  }

  if (pathname === '/api/admin/products' && method === 'POST') {
    const auth = verifyAdminRequest(req);
    if (!auth.ok || !['owner', 'product_manager'].includes(auth.role)) {
      return sendJson(res, 403, { ok: false, error: 'Admin or product_manager access required' });
    }
    const body = await readJsonBody(req);
    const title = String(body.title || '').trim();
    const affiliateUrl = String(body.affiliateUrl || '').trim();
    if (!title || !affiliateUrl) {
      return sendJson(res, 400, { ok: false, error: 'title and affiliateUrl are required' });
    }
    const item = {
      id: 'prod_' + Date.now(),
      title,
      category: String(body.category || 'General').trim(),
      price: Number(body.price || 0),
      currency: String(body.currency || 'INR').trim(),
      priceBand: ['low', 'medium', 'high'].includes(String(body.priceBand || '').toLowerCase())
        ? String(body.priceBand).toLowerCase()
        : 'medium',
      affiliateNetwork: String(body.affiliateNetwork || 'custom').trim(),
      affiliateUrl,
      commissionRate: 0.3,
      createdAt: new Date().toISOString()
    };
    STUDIO_CUSTOM_PRODUCTS.unshift(item);
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 201, { ok: true, product: item, total: STUDIO_CUSTOM_PRODUCTS.length });
  }

  if (pathname === '/api/reviews/verdict' && method === 'GET') {
    const productId = String(urlObj.searchParams.get('productId') || '').trim();
    if (productId) {
      const item = STUDIO_PRODUCT_VERDICTS[productId] || null;
      return sendJson(res, 200, { ok: true, productId, verdict: item });
    }
    return sendJson(res, 200, {
      ok: true,
      total: Object.keys(STUDIO_PRODUCT_VERDICTS).length,
      verdicts: STUDIO_PRODUCT_VERDICTS
    });
  }

  if (pathname === '/api/admin/reviews/verdict' && method === 'POST') {
    const auth = verifyAdminRequest(req);
    if (!auth.ok || !['owner', 'product_manager'].includes(auth.role)) {
      return sendJson(res, 403, { ok: false, error: 'Admin or product_manager access required' });
    }
    const body = await readJsonBody(req);
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return sendJson(res, 400, { ok: false, error: 'productId is required' });
    }
    const pros = Array.isArray(body.pros) ? body.pros.map((x) => String(x).trim()).filter(Boolean) : [];
    const cons = Array.isArray(body.cons) ? body.cons.map((x) => String(x).trim()).filter(Boolean) : [];
    const sources = Array.isArray(body.sources) ? body.sources.map((x) => String(x).trim()).filter(Boolean) : [];
    const ratingAvg = Number(body.ratingAvg || 0);
    const verdict = buildAiVerdictSummary(ratingAvg, pros.length, cons.length, body.verdict);
    const record = {
      productId,
      verdict,
      ratingAvg,
      pros,
      cons,
      sources,
      summary: String(body.summary || '').trim(),
      updatedAt: new Date().toISOString()
    };
    STUDIO_PRODUCT_VERDICTS[productId] = record;
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 200, { ok: true, verdict: record });
  }

  if (pathname === '/api/community/reports' && method === 'POST') {
    const body = await readJsonBody(req);
    const reason = String(body.reason || '').trim();
    const targetId = String(body.targetId || '').trim();
    if (!reason || !targetId) {
      return sendJson(res, 400, { ok: false, error: 'targetId and reason are required' });
    }
    const report = {
      id: 'rep_' + Date.now(),
      targetType: String(body.targetType || 'message').trim(),
      targetId,
      reason,
      reporterId: String(body.reporterId || 'anonymous').trim(),
      status: 'open',
      createdAt: new Date().toISOString()
    };
    STUDIO_MODERATION_REPORTS.unshift(report);
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 201, { ok: true, report });
  }

  if (pathname === '/api/admin/reports' && method === 'GET') {
    const auth = verifyAdminRequest(req);
    if (!auth.ok || !['owner', 'moderator'].includes(auth.role)) {
      return sendJson(res, 403, { ok: false, error: 'Admin or moderator access required' });
    }
    const status = String(urlObj.searchParams.get('status') || '').trim().toLowerCase();
    const list = status
      ? STUDIO_MODERATION_REPORTS.filter((r) => String(r.status || '').toLowerCase() === status)
      : STUDIO_MODERATION_REPORTS;
    return sendJson(res, 200, { ok: true, total: list.length, reports: list });
  }

  if (pathname === '/api/admin/reports/resolve' && method === 'POST') {
    const auth = verifyAdminRequest(req);
    if (!auth.ok || !['owner', 'moderator'].includes(auth.role)) {
      return sendJson(res, 403, { ok: false, error: 'Admin or moderator access required' });
    }
    const body = await readJsonBody(req);
    const id = String(body.id || '').trim();
    const nextStatus = String(body.status || 'resolved').trim().toLowerCase();
    if (!id || !['open', 'resolved', 'dismissed'].includes(nextStatus)) {
      return sendJson(res, 400, { ok: false, error: 'Valid id and status (open/resolved/dismissed) required' });
    }
    const found = STUDIO_MODERATION_REPORTS.find((r) => r.id === id);
    if (!found) {
      return sendJson(res, 404, { ok: false, error: 'Report not found' });
    }
    found.status = nextStatus;
    found.resolvedAt = new Date().toISOString();
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 200, { ok: true, report: found });
  }

  if (pathname === '/api/affiliate/click' && method === 'POST') {
    const body = await readJsonBody(req);
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return sendJson(res, 400, { ok: false, error: 'productId is required' });
    }
    const price = Math.max(0, Number(body.price || 0));
    const commissionRate = 0.3;
    const estimatedCommission = Number((price * commissionRate).toFixed(2));
    const clickId = 'clk_' + crypto.randomBytes(8).toString('hex');
    const clickRecord = {
      clickId,
      productId,
      referrerId: String(body.referrerId || 'direct').trim(),
      price,
      commissionRate,
      estimatedCommission,
      status: 'tracked',
      createdAt: new Date().toISOString()
    };
    STUDIO_AFFILIATE_CLICKS_LIST.unshift(clickRecord);
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 201, {
      ok: true,
      clickId,
      commissionRate,
      estimatedCommission,
      click: clickRecord
    });
  }

  if (pathname === '/api/admin/affiliate/clicks' && method === 'GET') {
    const auth = verifyAdminRequest(req);
    if (!auth.ok || !['owner', 'finance_manager'].includes(auth.role)) {
      return sendJson(res, 403, { ok: false, error: 'Admin or finance_manager access required' });
    }
    const totalEstimatedCommission = Number(
      STUDIO_AFFILIATE_CLICKS_LIST.reduce((acc, item) => acc + Number(item.estimatedCommission || 0), 0).toFixed(2)
    );
    return sendJson(res, 200, {
      ok: true,
      totalClicks: STUDIO_AFFILIATE_CLICKS_LIST.length,
      commissionRate: 0.3,
      totalEstimatedCommission,
      clicks: STUDIO_AFFILIATE_CLICKS_LIST
    });
  }

  if (pathname === '/api/translation/languages' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      config: getTranslationProviderConfig(),
      total: STUDIO_LANGUAGES.length,
      languages: STUDIO_LANGUAGES
    });
  }

  if (pathname === '/api/translation/translate' && method === 'POST') {
    const body = await readJsonBody(req);
    const text = String(body.text || '').trim();
    const targetLang = String(body.targetLang || body.lang || 'hi').trim().toLowerCase();
    if (!text) {
      return sendJson(res, 400, { ok: false, error: 'text is required' });
    }
    return sendJson(res, 200, {
      ok: true,
      targetLang,
      mode: 'fallback_preview',
      translatedText: '[' + targetLang + '] ' + text
    });
  }

  if (pathname === '/api/ads/config' && method === 'GET') {
    return sendJson(res, 200, { ok: true, config: getAdsConfigSummary() });
  }

  if (pathname === '/api/ads/impression' && method === 'POST') {
    const body = await readJsonBody(req);
    const slotId = String(body.slotId || 'banner_top').trim();
    const eventType = String(body.eventType || 'impression').trim().toLowerCase();
    const consentGiven = Boolean(body.consentGiven);
    if (!['impression', 'click'].includes(eventType)) {
      return sendJson(res, 400, { ok: false, error: 'eventType must be impression or click' });
    }
    const record = {
      id: 'ad_' + Date.now(),
      slotId,
      eventType,
      consentGiven,
      createdAt: new Date().toISOString()
    };
    STUDIO_AD_EVENTS.unshift(record);
    if (STUDIO_AD_EVENTS.length > 500) STUDIO_AD_EVENTS.length = 500;
    if (typeof saveStoreData === 'function') saveStoreData();
    return sendJson(res, 201, { ok: true, event: record, totalEvents: STUDIO_AD_EVENTS.length });
  }

  if (pathname === '/api/admin/session' && method === 'GET') {
    const check = verifyAdminRequest(req);
    if (!check.ok) {
      return sendJson(res, 401, { ok: false, authenticated: false });
    }
    return sendJson(res, 200, { ok: true, authenticated: true, role: check.role });
  }

  if (pathname === '/api/payment/webhook' && method === 'POST') {
    const secret = String(process.env.WEBHOOK_SECRET || '').trim();
    if (secret) {
      const sigHeader = String(req.headers['x-webhook-signature'] || '').trim();
      const rawCheck = JSON.stringify(await readJsonBody(req));
      const expected = crypto.createHmac('sha256', secret).update(rawCheck).digest('hex');
      if (!sigHeader || sigHeader !== expected) {
        return sendJson(res, 401, { ok: false, error: 'Invalid webhook signature' });
      }
    }
    if (false) {
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
    STUDIO_WEBHOOK_EVENTS.push(entry); saveStoreData();
    return sendJson(res, 200, { ok: true, webhook: entry, totalEvents: STUDIO_WEBHOOK_EVENTS.length });
    }
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
    STUDIO_CHAT_MESSAGES.push(message); saveStoreData();
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
    STUDIO_WEBRTC_SIGNALS.push(signal); saveStoreData();
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
