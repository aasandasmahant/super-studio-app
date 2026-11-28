const DEFAULT_CALLS_CONFIG = {
  voiceCallEnabled: false,
  videoCallEnabled: false,
  signalingProvider: '',
  iceServers: []
};

function resolveCallsConfig(customConfig = null) {
  if (!customConfig || typeof customConfig !== 'object') {
    return DEFAULT_CALLS_CONFIG;
  }
  return {
    voiceCallEnabled: Boolean(customConfig.voiceCallEnabled),
    videoCallEnabled: Boolean(customConfig.videoCallEnabled),
    signalingProvider: String(customConfig.signalingProvider || ''),
    iceServers: Array.isArray(customConfig.iceServers) ? customConfig.iceServers : []
  };
}

module.exports = { DEFAULT_CALLS_CONFIG, resolveCallsConfig };
