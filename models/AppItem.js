const { mongoose } = require('../config/db');

const AppItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    stage: { type: Number, default: 2 },
    status: { type: String, default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AppItem || mongoose.model('AppItem', AppItemSchema);
