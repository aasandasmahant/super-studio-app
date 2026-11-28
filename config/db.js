const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = (process.env.MONGO_URI || '').trim();
  if (!uri) {
    return { connected: false, reason: 'MONGO_URI is empty in .env (Stage 2 ready for URI)' };
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return { connected: true, host: mongoose.connection.host };
}

module.exports = { connectDatabase, mongoose };
