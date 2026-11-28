const DEFAULT_PARTNERS = {
  aff_30: {
    id: 'aff_30',
    name: 'Affiliate Partner 30',
    apiKey: '',
    trackingId: '',
    baseUrl: ''
  },
  aff_40: {
    id: 'aff_40',
    name: 'Affiliate Partner 40',
    apiKey: '',
    trackingId: '',
    baseUrl: ''
  },
  aff_50: {
    id: 'aff_50',
    name: 'Affiliate Partner 50',
    apiKey: '',
    trackingId: '',
    baseUrl: ''
  }
};

function resolvePartners(dbPartners = null) {
  const merged = {};
  for (const key of Object.keys(DEFAULT_PARTNERS)) {
    const base = DEFAULT_PARTNERS[key];
    const custom = dbPartners && dbPartners[key] ? dbPartners[key] : {};
    merged[key] = {
      id: base.id,
      name: custom.name || base.name,
      apiKey: typeof custom.apiKey === 'string' ? custom.apiKey : base.apiKey,
      trackingId: typeof custom.trackingId === 'string' ? custom.trackingId : base.trackingId,
      baseUrl: typeof custom.baseUrl === 'string' ? custom.baseUrl : base.baseUrl
    };
  }
  return merged;
}

function buildAffiliateLink(partnerId, productSlug = '', dbPartners = null) {
  const partners = resolvePartners(dbPartners);
  const p = partners[partnerId];
  if (!p || !p.baseUrl) return '#';
  const cleanSlug = String(productSlug || '').replace(/^\/+/, '');
  const sep = p.baseUrl.includes('?') ? '&' : '?';
  const slugPart = cleanSlug ? `/${encodeURIComponent(cleanSlug)}` : '';
  const tidParam = p.trackingId ? `${sep}aff=${encodeURIComponent(p.trackingId)}` : '';
  return `${p.baseUrl}${slugPart}${tidParam}`;
}

module.exports = { DEFAULT_PARTNERS, resolvePartners, buildAffiliateLink };
