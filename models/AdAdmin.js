const crypto = require('crypto');

const adState = {
  providers: [
    { id: 'prov_banner_1', name: 'default_ad_network', enabled: true, mode: 'test' }
  ],
  slots: [
    { id: 'slot_top_banner', name: 'Top Fixed Banner', placement: 'top', active: true }
  ],
  campaigns: []
};

function createCampaign({ title, providerId = 'prov_banner_1', slotId = 'slot_top_banner', budget = 0 }) {
  const campaign = {
    id: `cmp_${crypto.randomBytes(5).toString('hex')}`,
    title: String(title).trim(),
    providerId,
    slotId,
    budget: Number(budget) || 0,
    impressions: 0,
    clicks: 0,
    approved: false,
    status: 'pending_review',
    createdAt: new Date().toISOString()
  };
  adState.campaigns.unshift(campaign);
  return campaign;
}

module.exports = { adState, createCampaign };
