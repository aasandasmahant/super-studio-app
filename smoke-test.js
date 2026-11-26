const assert = require('assert');
const aff = require('./affiliate-config');
const prod = require('./products-config');
const analysis = require('./product-analysis');
const analytics = require('./analytics-sources');
const langs = require('./languages-config');
const comm = require('./community-chat');
const pay = require('./payments-commission');
const ads = require('./ads-config');
const calls = require('./calls-config');

assert.strictEqual(aff.buildAffiliateLink('aff_30', 'item-1'), '#');
assert.strictEqual(prod.resolveProducts().length, 3);
assert.strictEqual(analysis.buildProductAnalysis({ id: 'p1', pros: ['Fast'] }).productId, 'p1');
assert.strictEqual(analytics.resolveAnalyticsSources().youtube.enabled, false);
assert(langs.buildSupportedLanguages().length >= 205);
assert.strictEqual(comm.sanitizeChatMessage({ text: '  hello  ' }).text, 'hello');
assert.strictEqual(pay.calculateCommission(1000, 30), 300);
assert.strictEqual(ads.resolveAdsConfig().enabled, false);
assert.strictEqual(calls.resolveCallsConfig().voiceCallEnabled, false);

console.log('ALL SMOKE TESTS PASSED');
const adminStore = require('./mongo-admin-store');
const store = adminStore.createAdminStore();
store.updateSection('adsConfig', { enabled: false });
assert.strictEqual(store.getState().adsConfig.enabled, false);
console.log('MONGO ADMIN STORE TEST PASSED');
