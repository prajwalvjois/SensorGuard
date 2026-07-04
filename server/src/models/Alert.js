const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['SENSOR_SPOOF', 'REPLAY_ATTACK', 'DATA_INJECTION', 'THRESHOLD_BREACH', 'SYSTEM'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      required: true,
    },
    sensor: { type: String, default: null },
    title: { type: String, required: true },
    description: { type: String, required: true },
    isAcknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    anomalyScore: { type: Number, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    attackVector: {
      sensorAffected: String,
      deviationZScore: Number,
      neighborZScore: Number,
      hmacStatus: String,
      confidence: Number,
    },
  },
  { timestamps: true }
);

alertSchema.index({ createdAt: -1 });
alertSchema.index({ type: 1, severity: 1 });
alertSchema.index({ isAcknowledged: 1 });

module.exports = mongoose.model('Alert', alertSchema);
