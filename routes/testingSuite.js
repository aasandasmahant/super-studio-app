const express = require('express');
const crypto = require('crypto');

const router = express.Router();

router.get('/run', async (req, res) => {
  const startedAt = Date.now();
  const base = `${req.protocol}://${req.get('host')}`;
  const checks = [];

  try {
    const [h, o, p, a, c, u, m] = await Promise.all([
      fetch(`${base}/health`).then((r) => r.json()),
      fetch(`${base}/api/owner/overview`).then((r) => r.json()),
      fetch(`${base}/api/payments/summary`).then((r) => r.json()),
      fetch(`${base}/api/ads/report`).then((r) => r.json()),
      fetch(`${base}/api/chat/analytics`).then((r) => r.json()),
      fetch(`${base}/api/users/summary`).then((r) => r.json()),
      fetch(`${base}/admin/meta`).then((r) => r.json())
    ]);

    checks.push({ name: 'health_and_crypto', passed: Boolean(h.ok && h.cryptoReady) });
    checks.push({ name: 'owner_admin', passed: Boolean(o.ok && o.stage === 3) });
    checks.push({ name: 'payment_admin', passed: Boolean(p.ok && p.stage === 4) });
    checks.push({ name: 'ad_admin', passed: Boolean(a.ok && a.stage === 5) });
    checks.push({ name: 'chat_admin', passed: Boolean(c.ok && c.stage === 6) });
    checks.push({ name: 'user_support', passed: Boolean(u.ok && u.stage === 7) });
    checks.push({ name: 'admin_frontend', passed: Boolean(m.ok && m.stage === 8) });
  } catch (err) {
    checks.push({ name: 'endpoint_sweep', passed: false, error: err.message });
  }

  const secret = process.env.WEBHOOK_SECRET || '';
  const samplePayload = JSON.stringify({ ping: 'stage9' });
  const sig = crypto.createHmac('sha256', secret).update(samplePayload).digest('hex');
  checks.push({
    name: 'hmac_security_check',
    passed: secret.length >= 6 && sig.length === 64
  });

  const durationMs = Date.now() - startedAt;
  const allPassed = checks.every((item) => item.passed);

  res.status(allPassed ? 200 : 500).json({
    ok: allPassed,
    stage: 9,
    performance: { durationMs, withinBudget: durationMs < 2000 },
    checks
  });
});

module.exports = router;
