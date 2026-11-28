const express = require('express');
const { paymentState, createTransaction, createRefund } = require('../models/PaymentAdmin');

const router = express.Router();

router.get('/summary', (req, res) => {
  const totalVolume = paymentState.transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalCommission = paymentState.transactions.reduce((sum, t) => sum + Number(t.commission || 0), 0);
  res.json({
    ok: true,
    stage: 4,
    gateway: paymentState.gateway,
    totals: {
      transactionsCount: paymentState.transactions.length,
      refundsCount: paymentState.refunds.length,
      totalVolume,
      totalCommission
    }
  });
});

router.patch('/gateway', (req, res) => {
  const { provider, mode, enabled, defaultCommissionPercent } = req.body || {};
  if (typeof provider === 'string' && provider.trim()) paymentState.gateway.provider = provider.trim();
  if (mode === 'sandbox' || mode === 'live') paymentState.gateway.mode = mode;
  if (typeof enabled === 'boolean') paymentState.gateway.enabled = enabled;
  if (typeof defaultCommissionPercent === 'number' && defaultCommissionPercent >= 0 && defaultCommissionPercent <= 100) {
    paymentState.gateway.defaultCommissionPercent = defaultCommissionPercent;
  }
  res.json({ ok: true, gateway: paymentState.gateway });
});

router.post('/transactions', (req, res) => {
  const { amount, currency, userId, commissionPercent } = req.body || {};
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'Valid positive amount is required' });
  }
  const tx = createTransaction({ amount, currency, userId, commissionPercent });
  res.status(201).json({ ok: true, transaction: tx });
});

router.post('/refunds', (req, res) => {
  const { transactionId, reason } = req.body || {};
  if (!transactionId) {
    return res.status(400).json({ ok: false, error: 'transactionId is required' });
  }
  const refund = createRefund({ transactionId, reason });
  if (!refund) {
    return res.status(404).json({ ok: false, error: 'Transaction not found' });
  }
  res.status(201).json({ ok: true, refund });
});

module.exports = router;
