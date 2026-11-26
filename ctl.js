const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'yaschat-data.json');
const readDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const [, , cmd, ...args] = process.argv;
const db = readDb();
db.products = db.products || [];
db.messages = db.messages || [];
db.purchases = db.purchases || [];
db.settings = db.settings || { appName: 'YAS CHAT', allowSignup: true, commissionRate: 0.15 };

if (cmd === 'add-product') {
  const [tier = 'low', company = 'BrandX', title, price = '19.99', link = '', pros = 'अच्छा विकल्प', cons = 'सीमित विकल्प', buyFor = 'सामान्य यूज़र्स', skipFor = 'विशेष ज़रूरत वाले', rating = '4.5', accuratePercent = '90%', benefitsCount = '3'] = args;
  if (!title) {
    console.log('Usage: node ctl.js add-product <low|medium|high> <Company> <Title> <Price> <Link> <Pros> <Cons> <BuyFor> <SkipFor> <Rating> <Percent> <Benefits>');
    process.exit(1);
  }
  const prod = {
    id: 'p-' + Date.now(),
    tier,
    company,
    title,
    price,
    link,
    pros,
    cons,
    buyFor,
    skipFor,
    rating,
    accuratePercent,
    benefitsCount: Number(benefitsCount) || 3,
    images: db.products[0] && Array.isArray(db.products[0].images) ? db.products[0].images : []
  };
  db.products.unshift(prod);
  writeDb(db);
  console.log('Added:', prod.id, prod.title);
} else if (cmd === 'list-products') {
  console.log(db.products.map(p => ({ id: p.id, tier: p.tier, company: p.company, title: p.title, price: p.price })));
} else if (cmd === 'del-product') {
  const id = args[0];
  db.products = db.products.filter((p) => p.id !== id && p.title !== id);
  writeDb(db);
  console.log('Deleted:', id);
} else if (cmd === 'record-sale') {
  const [username, productId, country = 'India', amountStr = '49.99'] = args;
  if (!username || !productId) {
    console.log('Usage: node ctl.js record-sale <username> <productId> <country> <amount>');
    process.exit(1);
  }
  const amount = Number(amountStr) || 0;
  const commission = Number((amount * (db.settings.commissionRate || 0.15)).toFixed(2));
  const sale = { id: 'sale-' + Date.now(), username, productId, country, amount, commission, refunded: false, time: Date.now() };
  db.purchases.push(sale);
  writeDb(db);
  console.log('Recorded sale:', sale);
} else if (cmd === 'refund-sale') {
  const saleId = args[0];
  const item = db.purchases.find((p) => p.id === saleId);
  if (!item) return console.log('Not found:', saleId);
  item.refunded = true;
  item.commission = 0;
  writeDb(db);
  console.log('Refunded:', item);
} else if (cmd === 'list-sales') {
  console.log(db.purchases);
} else if (cmd === 'signup') {
  const mode = args[0];
  if (mode === 'on' || mode === 'off') {
    db.settings.allowSignup = mode === 'on';
    writeDb(db);
  }
  console.log('allowSignup =', db.settings.allowSignup);
} else {
  console.log([
    'YAS CHAT ctl.js commands:',
    '  node ctl.js add-product <low|medium|high> <Company> <Title> <Price> <Link> <Pros> <Cons> <BuyFor> <SkipFor> <Rating> <Percent> <Benefits>',
    '  node ctl.js list-products',
    '  node ctl.js del-product <id-or-title>',
    '  node ctl.js record-sale <username> <productId> <country> <amount>',
    '  node ctl.js refund-sale <saleId>',
    '  node ctl.js list-sales',
    '  node ctl.js signup on|off'
  ].join('\n'));
}
