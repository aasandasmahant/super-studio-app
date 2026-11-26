const MONGO_SCHEMAS = {
  users: {
    fields: { id: 'string', username: 'string', role: 'string', lang: 'string', createdAt: 'number' },
    indexes: [{ username: 1 }]
  },
  products: {
    fields: { id: 'string', title: 'string', category: 'string', commissionPercent: 'number', url: 'string' },
    indexes: [{ category: 1 }]
  },
  referrals: {
    fields: { id: 'string', referrerId: 'string', amount: 'number', commission: 'number', createdAt: 'number' },
    indexes: [{ referrerId: 1 }]
  },
  notifications: {
    fields: { id: 'string', title: 'string', message: 'string', createdAt: 'number' },
    indexes: [{ createdAt: -1 }]
  },
  affiliateLinks: {
    fields: { id: 'string', network: 'string', title: 'string', url: 'string', commissionPercent: 'number', createdAt: 'number' },
    indexes: [{ network: 1 }]
  }
};

module.exports = { MONGO_SCHEMAS };
