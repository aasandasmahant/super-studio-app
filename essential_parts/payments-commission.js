const DEFAULT_PAYMENT_CONFIG = {
  gatewayProvider: '',
  apiKey: '',
  webhookSecret: '',
  defaultCommissionRate: 0,
  referralCommissionRate: 0,
  currency: 'INR'
};

function resolvePaymentConfig(customConfig = null) {
  if (!customConfig || typeof customConfig !== 'object') {
    return DEFAULT_PAYMENT_CONFIG;
  }
  return {
    gatewayProvider: String(customConfig.gatewayProvider || ''),
    apiKey: String(customConfig.apiKey || ''),
    webhookSecret: String(customConfig.webhookSecret || ''),
    defaultCommissionRate: Number(customConfig.defaultCommissionRate) || 0,
    referralCommissionRate: Number(customConfig.referralCommissionRate) || 0,
    currency: String(customConfig.currency || 'INR')
  };
}

function calculateCommission(amount, ratePercent) {
  const amt = Number(amount) || 0;
  const rate = Number(ratePercent) || 0;
  return Number(((amt * rate) / 100).toFixed(2));
}

module.exports = { DEFAULT_PAYMENT_CONFIG, resolvePaymentConfig, calculateCommission };
