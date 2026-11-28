const DEFAULT_ADS_CONFIG = {
  enabled: false,
  provider: '',
  slotId: '',
  scriptUrl: '',
  fallbackSlots: []
};

function resolveAdsConfig(customConfig = null) {
  if (!customConfig || typeof customConfig !== 'object') {
    return DEFAULT_ADS_CONFIG;
  }
  return {
    enabled: Boolean(customConfig.enabled),
    provider: String(customConfig.provider || ''),
    slotId: String(customConfig.slotId || ''),
    scriptUrl: String(customConfig.scriptUrl || ''),
    fallbackSlots: Array.isArray(customConfig.fallbackSlots) ? customConfig.fallbackSlots : []
  };
}

module.exports = { DEFAULT_ADS_CONFIG, resolveAdsConfig };
