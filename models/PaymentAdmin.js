const crypto = require('crypto');

const paymentState = {
  gateway: {
    provider: 'default_gateway',
    mode: 'sandbox',
    enabled: false,
    defaultCommissionPercent: 10
  },
  transactions: [],
  refunds: []
};

function createTransaction({ amount, currency = 'INR', userId = 'user_1', commissionPercent }) {
  const numericAmount = Number(amount);
  const rate = typeof commissionPercent === 'number' ? commissionPercent : paymentState.gateway.defaultCommissionPercent;
  const commission = Number(((numericAmount * rate) / 100).toFixed(2));
  const tx = {
    id: `tx_${crypto.randomBytes(5).toString('hex')}`,
    userId,
    amount: numericAmount,
    currency,
    commission,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  paymentState.transactions.unshift(tx);
  return tx;
}

function createRefund({ transactionId, reason = 'requested_by_user' }) {
  const tx = paymentState.transactions.find((t) => t.id === transactionId);
  if (!tx) return null;
  tx.status = 'refunded';
  const refund = {
    id: `rf_${crypto.randomBytes(5).toString('hex')}`,
    transactionId,
    amount: tx.amount,
    reason,
    createdAt: new Date().toISOString()
  };
  paymentState.refunds.unshift(refund);
  return refund;
}

module.exports = { paymentState, createTransaction, createRefund };
