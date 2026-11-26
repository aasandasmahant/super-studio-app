const DEFAULT_ADMIN_STATE = {
  affiliates: {},
  products: [],
  analyticsSources: {},
  adsConfig: {},
  callsConfig: {},
  paymentConfig: {}
};

function createAdminStore(initialState = null) {
  let state = {
    ...DEFAULT_ADMIN_STATE,
    ...(initialState && typeof initialState === 'object' ? initialState : {})
  };

  function getState() {
    return state;
  }

  function updateSection(section, payload) {
    if (!section || typeof section !== 'string') return state;
    state = {
      ...state,
      [section]: payload
    };
    return state;
  }

  function hasMongoUri(env = process.env) {
    return Boolean(env && typeof env.MONGODB_URI === 'string' && env.MONGODB_URI.trim().length > 0);
  }

  return { getState, updateSection, hasMongoUri };
}

module.exports = { DEFAULT_ADMIN_STATE, createAdminStore };
