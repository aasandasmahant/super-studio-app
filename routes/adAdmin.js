const express = require('express');
const { adState, createCampaign } = require('../models/AdAdmin');

const router = express.Router();

router.get('/report', (req, res) => {
  const totalImpressions = adState.campaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicks = adState.campaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  res.json({
    ok: true,
    stage: 5,
    providersCount: adState.providers.length,
    slotsCount: adState.slots.length,
    campaignsCount: adState.campaigns.length,
    report: {
      totalImpressions,
      totalClicks
    }
  });
});

router.post('/campaigns', (req, res) => {
  const { title, providerId, slotId, budget } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ ok: false, error: 'Campaign title is required' });
  }
  const campaign = createCampaign({ title, providerId, slotId, budget });
  res.status(201).json({ ok: true, campaign });
});

router.patch('/campaigns/:id/approve', (req, res) => {
  const campaign = adState.campaigns.find((c) => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ ok: false, error: 'Campaign not found' });
  }
  campaign.approved = true;
  campaign.status = 'active';
  res.json({ ok: true, campaign });
});

module.exports = router;
