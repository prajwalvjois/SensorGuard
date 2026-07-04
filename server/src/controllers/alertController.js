const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const simulatorService = require('../services/simulatorService');

const getAlerts = async (req, res) => {
  try {
    const { severity, type, limit = 50, offset = 0, acknowledged } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (acknowledged !== undefined) filter.isAcknowledged = acknowledged === 'true';

    // Prefer DB; fall back to in-memory
    if (mongoose.connection.readyState === 1) {
      const [alerts, total] = await Promise.all([
        Alert.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)),
        Alert.countDocuments(filter),
      ]);
      return res.json({ success: true, data: alerts, total, hasMore: total > Number(offset) + Number(limit) });
    }

    // Memory-mode fallback
    let alerts = simulatorService.getInMemoryAlerts(200);
    if (severity) alerts = alerts.filter(a => a.severity === severity);
    if (type) alerts = alerts.filter(a => a.type === type);
    const paginated = alerts.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ success: true, data: paginated, total: alerts.length, hasMore: alerts.length > Number(offset) + Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Acknowledged (memory mode)' });
    }
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isAcknowledged: true, acknowledgedBy: req.user.id, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: { message: 'Alert not found' } });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

const getAlertStats = async (req, res) => {
  try {
    let stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0, unacknowledged: 0 };

    if (mongoose.connection.readyState === 1) {
      const pipeline = [
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ];
      const results = await Alert.aggregate(pipeline);
      for (const r of results) { stats[r._id] = r.count; stats.total += r.count; }
      stats.unacknowledged = await Alert.countDocuments({ isAcknowledged: false });
    } else {
      const alerts = simulatorService.getInMemoryAlerts(200);
      for (const a of alerts) {
        stats.total++;
        if (stats[a.severity] !== undefined) stats[a.severity]++;
        if (!a.isAcknowledged) stats.unacknowledged++;
      }
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

module.exports = { getAlerts, acknowledgeAlert, getAlertStats };
