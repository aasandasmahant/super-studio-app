const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'yaschat-data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const hashPass = (p) => crypto.createHash('sha256').update(String(p)).digest('hex');
const makeToken = () => crypto.randomBytes(16).toString('hex');

const makeFiveImages = (label, bg1, bg2) => [0, 1, 2, 3, 4].map((idx) => {
  const angles = ['Front View', 'Side Angle', 'Detail Shot', 'In Use', 'Compact View'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="480" height="320" rx="22" fill="url(#g)"/><circle cx="390" cy="70" r="56" fill="rgba(255,255,255,0.09)"/><text x="28" y="64" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="bold">${label.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text><text x="28" y="102" fill="#e2e8f0" font-family="sans-serif" font-size="16">Photo ${idx + 1}/5 • ${angles[idx]}</text><rect x="28" y="242" width="170" height="40" rx="12" fill="rgba(0,0,0,0.35)"/><text x="42" y="268" fill="#ffffff" font-family="sans-serif" font-size="15">YAS CHAT Preview</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
});

const defaultProducts = () => {
  const lowItems = [
    ['SoundWave', 'Wired Bass Earbuds', '9.99', '4.3', '88%', 3, 'साफ़ आवाज़ और कम दाम', 'केबल हल्की है', 'बजट में कॉल व गाने सुनने वालों को', 'वायरलेस पसंद करने वालों को', '#1d4ed8', '#0f172a', 'https://example.com/low-soundwave'],
    ['VoltEdge', 'Mini USB Wall Charger', '11.50', '4.2', '86%', 3, 'छोटा साइज और रोज़ाना भरोसेमंद', 'बहुत तेज़ चार्जर नहीं', 'यात्रा और बैकअप चार्जर चाहने वालों को', 'हैवी लैपटॉप चार्ज करने वालों को', '#047857', '#06281e', 'https://example.com/low-voltedge'],
    ['LiteGrip', 'Anti-Slip Phone Stand', '7.99', '4.4', '90%', 2, 'मज़बूत पकड़ और हल्का वज़न', 'ऊँचाई एडजस्ट नहीं होती', 'टेबल पर वीडियो देखने वालों को', 'हर एंगल पर झुकाने की चाह रखने वालों को', '#6d28d9', '#1e1035', 'https://example.com/low-litegrip'],
    ['ClearPulse', 'Braided Type-C Cable', '8.49', '4.1', '85%', 3, 'मुड़ने-टूटने से बचाव वाली कोटिंग', 'लंबाई औसत है', 'पुरानी केबल बदलना चाहने वालों को', 'बहुत लंबी केबल चाहने वालों को', '#b45309', '#291504', 'https://example.com/low-clearpulse'],
    ['AeroTune', 'Compact Neckband Lite', '14.99', '4.4', '89%', 4, 'अच्छी बैटरी और हल्का कॉलर', 'भारी बेस नहीं मिलता', 'रनिंग या कॉलिंग करने वालों को', 'स्टूडियो साउंड चाहने वालों को', '#be123c', '#2b0610', 'https://example.com/low-aerotune']
  ];
  const medItems = [
    ['SonicCore', 'Wireless ANC Headphones', '49.99', '4.6', '92%', 4, 'शोर कम करने वाली सुविधा और आराम', 'लंबे समय में कान हल्के गर्म हो सकते हैं', 'ऑफ़िस, पढ़ाई और सफ़र करने वालों को', 'अत्यधिक कम बजट वालों को', '#0369a1', '#082032', 'https://example.com/med-soniccore'],
    ['ChronoPulse', 'Fitness AMOLED Band', '39.99', '4.5', '90%', 4, 'साफ़ डिस्प्ले और स्टेप/स्लीप ट्रैकिंग', 'कॉलिंग स्पीकर नहीं है', 'फिटनेस और डेली रूटीन ट्रैक करने वालों को', 'बड़ी स्मार्टवॉच डायल चाहने वालों को', '#0f766e', '#052220', 'https://example.com/med-chronopulse'],
    ['PowerVault', '20000mAh Fast Powerbank', '34.99', '4.7', '93%', 4, 'कई बार फ़ोन चार्ज करने की क्षमता', 'थोड़ा भारी आकार है', 'लंबे सफ़र और ज़्यादा इस्तेमाल वालों को', 'पॉकेट में हल्का रखने वालों को', '#4338ca', '#151238', 'https://example.com/med-powervault'],
    ['GlowCraft', 'Smart Desk Lamp Pro', '29.99', '4.5', '91%', 3, 'आँखों पर नरम रोशनी और कई मोड', 'बैटरी बैकअप सीमित है', 'रात में पढ़ने या काम करने वालों को', 'पोर्टेबल आउटडोर लाइट चाहने वालों को', '#c2410c', '#2c1206', 'https://example.com/med-glowcraft'],
    ['AirStream', 'Portable Bluetooth Speaker', '44.99', '4.6', '92%', 4, 'कमरे के लिए साफ़ आवाज़ और पोर्टेबिलिटी', 'बहुत ऊँची पार्टी वॉल्यूम नहीं', 'घर या छोटे ग्रुप में संगीत सुनने वालों को', 'बड़े साउंड सिस्टम की चाह रखने वालों को', '#9d174d', '#2b0718', 'https://example.com/med-airstream']
  ];
  const highItems = [
    ['ApexAudio', 'Studio Reference Headset', '149.99', '4.8', '95%', 5, 'स्पष्ट साउंड डिटेल और प्रीमियम बिल्ड', 'कीमत अधिक है', 'क्रिएटर्स, एडिटर्स और ऑडियो प्रेमियों को', 'साधारण बजट यूज़र्स को', '#1e40af', '#09132c', 'https://example.com/high-apexaudio'],
    ['TitanWear', 'Sapphire GPS Smartwatch', '179.99', '4.8', '94%', 5, 'मज़बूत ग्लास, GPS और लंबी बैटरी', 'महँगा विकल्प है', 'आउटडोर, स्पोर्ट्स और हेल्थ ट्रैकिंग वालों को', 'बेसिक टाइम/नोटिफिकेशन चाहने वालों को', '#065f46', '#031f17', 'https://example.com/high-titanwear'],
    ['LuminaCam', '4K Creator Webcam Ultra', '129.99', '4.7', '93%', 4, 'तेज़ ऑटोफ़ोकस और साफ़ वीडियो क्वालिटी', 'डेस्क सेटअप के लिए बेहतर', 'मीटिंग, स्ट्रीमिंग और कंटेंट बनाने वालों को', 'साधारण मोबाइल यूज़र्स को', '#5b21b6', '#190a33', 'https://example.com/high-luminacam'],
    ['ChargeMax', '100W GaN Multi-Port Hub', '89.99', '4.8', '95%', 4, 'एक साथ कई डिवाइस तेज़ चार्ज करने की सुविधा', 'प्रीमियम प्राइस रेंज', 'लैपटॉप, टैबलेट और फ़ोन साथ रखने वालों को', 'केवल एक साधारण चार्जर चाहने वालों को', '#92400e', '#241003', 'https://example.com/high-chargemax'],
    ['KeyCraft', 'Wireless Mechanical Keyboard', '119.99', '4.7', '94%', 4, 'आरामदायक टाइपिंग फील और मल्टी-डिवाइस', 'थोड़ी टाइपिंग आवाज़ रहती है', 'ज़्यादा लिखने या कोडिंग करने वालों को', 'बिल्कुल शांत मेम्ब्रेन की चाह रखने वालों को', '#881337', '#26040f', 'https://example.com/high-keycraft']
  ];

  const pack = (arr, tier) => arr.map((x, idx) => ({
    id: `${tier}-${idx + 1}`,
    tier,
    company: x[0],
    title: x[1],
    price: x[2],
    rating: x[3],
    accuratePercent: x[4],
    benefitsCount: x[5],
    pros: x[6],
    cons: x[7],
    buyFor: x[8],
    skipFor: x[9],
    link: x[12],
    images: makeFiveImages(`${x[0]} • ${x[1]}`, x[10], x[11])
  }));

  return [...pack(lowItems, 'low'), ...pack(medItems, 'medium'), ...pack(highItems, 'high')];
};

let db = {
  settings: {
    appName: 'YAS CHAT',
    allowSignup: true,
    commissionRate: 0.15
  },
  users: [],
  sessions: {},
  messages: [
    {
      id: 1,
      sender: 'YAS Community',
      text: 'YAS CHAT में आपका स्वागत है — यहाँ Low, Medium और High प्रोडक्ट्स की पूरी जानकारी और चैट उपलब्ध है।',
      time: Date.now()
    }
  ],
  communities: [
    { id: 'global-creators', name: 'Global Creators Hub', members: 1240, joinedBy: [] },
    { id: 'smart-deals', name: 'Smart Deals & Reviews', members: 890, joinedBy: [] },
    { id: 'daily-learn', name: 'Daily Knowledge Club', members: 650, joinedBy: [] }
  ],
  products: defaultProducts(),
  shareClicks: [],
  purchases: []
};

if (fs.existsSync(DB_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db = {
      ...db,
      ...saved,
      settings: { ...db.settings, ...(saved.settings || {}) }
    };
  } catch (e) {}
}
if (!Array.isArray(db.products) || !db.products.length) {
  db.products = defaultProducts();
}

const saveDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {}
};
saveDb();

const getUserFromReq = (req) => {
  const token = String(req.headers['x-auth-token'] || '');
  if (!token || !db.sessions[token]) return null;
  const uid = db.sessions[token];
  return db.users.find((u) => u.id === uid) || null;
};

app.get('/api/auth/me', (req, res) => {
  const u = getUserFromReq(req);
  if (!u) return res.json({ user: null, allowSignup: db.settings.allowSignup });
  res.json({
    user: { id: u.id, username: u.username, email: u.email },
    allowSignup: db.settings.allowSignup
  });
});

app.post('/api/auth/signup', (req, res) => {
  if (!db.settings.allowSignup) {
    return res.status(403).json({ error: 'Signup is currently disabled' });
  }
  const rawUser = String(req.body.username || '').trim().replace(/\s+/g, '_').slice(0, 30);
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 80);
  const password = String(req.body.password || '');
  if (!rawUser || !email || password.length < 4) {
    return res.status(400).json({ error: 'Username, email and password (min 4 chars) required' });
  }
  if (db.users.some((u) => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  if (db.users.some((u) => u.username.toLowerCase() === rawUser.toLowerCase())) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  const user = {
    id: Date.now(),
    username: rawUser,
    email,
    passwordHash: hashPass(password)
  };
  db.users.push(user);
  const token = makeToken();
  db.sessions[token] = user.id;
  saveDb();
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.users.find((u) => u.email === email && u.passwordHash === hashPass(password));
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = makeToken();
  db.sessions[token] = user.id;
  saveDb();
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = String(req.headers['x-auth-token'] || '');
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDb();
  }
  res.json({ ok: true });
});

app.get('/api/messages', (req, res) => res.json(db.messages));
app.post('/api/messages', (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Empty message' });
  const u = getUserFromReq(req);
  const sender = u ? u.username : String(req.body.sender || 'Guest').trim().slice(0, 30) || 'Guest';
  const msg = { id: Date.now(), sender, text, time: Date.now() };
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
  if (!comm) return res.status(404).json({ error: 'Community not found' });
  comm.joinedBy = comm.joinedBy || [];
  const idx = comm.joinedBy.indexOf(uid);
  if (idx >= 0) {
    comm.joinedBy.splice(idx, 1);
    comm.members = Math.max(0, comm.members - 1);
  } else {
    comm.joinedBy.push(uid);
    comm.members += 1;
  }
  saveDb();
  res.json({ id: comm.id, name: comm.name, members: comm.members, joined: idx < 0 });
});

app.get('/api/products', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const tier = String(req.query.tier || 'all').toLowerCase().trim();
  let list = db.products.slice();
  if (tier !== 'all') {
    list = list.filter((p) => String(p.tier || 'medium').toLowerCase() === tier);
  }
  if (q) {
    list = list.filter(
      (p) =>
        String(p.title || '').toLowerCase().includes(q) ||
        String(p.company || '').toLowerCase().includes(q) ||
        String(p.pros || '').toLowerCase().includes(q)
    );
  }
  res.json(list);
});

app.post('/api/track-share', (req, res) => {
  const u = getUserFromReq(req);
  const username = u ? u.username : String(req.body.username || 'guest').trim() || 'guest';
  const productId = String(req.body.productId || '');
  const prod = db.products.find((p) => p.id === productId || p.title === productId);
  db.shareClicks.push({
    id: Date.now(),
    username,
    productId: prod ? prod.id : productId,
    productTitle: prod ? prod.title : productId,
    time: Date.now()
  });
  saveDb();
  res.json({ ok: true });
});

app.get('/api/analytics', (req, res) => {
  const u = getUserFromReq(req);
  const targetUser = u ? u.username : String(req.query.username || '').trim();
  if (!targetUser) {
    return res.json({
      username: null,
      sharesCount: 0,
      totalPurchases: 0,
      refundedPurchases: 0,
      validPurchases: 0,
      earnedAmount: '0.00',
      pendingOrRefundedNote: 'Login करें या अपना username डालें ताकि आपके शेयर लिंक की खरीदारी और देशवार Analytics दिखे।',
      countries: []
    });
  }
  const userShares = db.shareClicks.filter((s) => s.username.toLowerCase() === targetUser.toLowerCase());
  const userSales = db.purchases.filter((p) => p.username.toLowerCase() === targetUser.toLowerCase());
  const validSales = userSales.filter((p) => !p.refunded);
  const refundedSales = userSales.filter((p) => Boolean(p.refunded));
  const earnedAmount = validSales
    .reduce((sum, item) => sum + Number(item.commission || 0), 0)
    .toFixed(2);

  const countryMap = {};
  for (const sale of validSales) {
    const c = sale.country || 'Unknown';
    if (!countryMap[c]) countryMap[c] = { country: c, purchases: 0, amount: 0 };
    countryMap[c].purchases += 1;
    countryMap[c].amount += Number(sale.commission || 0);
  }
  const countries = Object.values(countryMap)
    .map((x) => ({ country: x.country, purchases: x.purchases, amount: x.amount.toFixed(2) }))
    .sort((a, b) => b.purchases - a.purchases);

  res.json({
    username: targetUser,
    sharesCount: userShares.length,
    totalPurchases: userSales.length,
    refundedPurchases: refundedSales.length,
    validPurchases: validSales.length,
    earnedAmount,
    countries
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n====================================');
  console.log(' YAS CHAT RUNNING AT: http://localhost:' + PORT);
  console.log(' External Control: node ctl.js');
  console.log('====================================\n');
});
