const DEFAULT_COMMUNITIES = [
  {
    id: 'comm_1',
    name: '',
    description: '',
    membersCount: 0,
    joinedBy: []
  }
];

function sanitizeChatMessage(raw = {}) {
  const text = String(raw.text || '').trim().slice(0, 1000);
  return {
    id: raw.id || '',
    communityId: raw.communityId || 'comm_1',
    sender: String(raw.sender || 'Guest').trim().slice(0, 60) || 'Guest',
    lang: String(raw.lang || 'hi').toLowerCase(),
    text,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function toggleCommunityJoin(community, userId) {
  if (!community || !userId) return community;
  const uid = String(userId);
  const current = Array.isArray(community.joinedBy) ? community.joinedBy.map(String) : [];
  const exists = current.includes(uid);
  const nextJoined = exists ? current.filter((x) => x !== uid) : [...current, uid];
  return {
    ...community,
    joinedBy: nextJoined,
    membersCount: nextJoined.length
  };
}

module.exports = { DEFAULT_COMMUNITIES, sanitizeChatMessage, toggleCommunityJoin };
