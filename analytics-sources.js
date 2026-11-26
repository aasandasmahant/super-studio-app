const DEFAULT_ANALYTICS_SOURCES = {
  youtube: {
    enabled: false,
    apiKey: '',
    channelId: '',
    lastSyncedAt: null
  },
  rssFeeds: [],
  forumSources: []
};

function resolveAnalyticsSources(customSources = null) {
  if (!customSources || typeof customSources !== 'object') {
    return DEFAULT_ANALYTICS_SOURCES;
  }
  return {
    youtube: {
      enabled: Boolean(customSources.youtube && customSources.youtube.enabled),
      apiKey: (customSources.youtube && customSources.youtube.apiKey) || '',
      channelId: (customSources.youtube && customSources.youtube.channelId) || '',
      lastSyncedAt: (customSources.youtube && customSources.youtube.lastSyncedAt) || null
    },
    rssFeeds: Array.isArray(customSources.rssFeeds) ? customSources.rssFeeds : [],
    forumSources: Array.isArray(customSources.forumSources) ? customSources.forumSources : []
  };
}

module.exports = { DEFAULT_ANALYTICS_SOURCES, resolveAnalyticsSources };
