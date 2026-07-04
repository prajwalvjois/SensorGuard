const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const simulatorService = require('../services/simulatorService');
const Alert = require('../models/Alert');

const alertThrottleCache = new Map();
const THROTTLE_WINDOW_MS = 300;

/**
 * Sets up all Socket.io event handlers.
 * Broadcasts readings + alerts to authenticated clients.
 */
module.exports = function setupSocketHandlers(io) {
  // ─── JWT Auth Middleware ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-dev-secret');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`  [Socket] Client connected: ${socket.id.slice(0, 8)}`);

    // Send historical data immediately on connect
    socket.emit('sensorHistory', simulatorService.getHistory());

    // Send recent in-memory alerts
    socket.emit('initialAlerts', simulatorService.getInMemoryAlerts(50));

    // ─── Sensor Readings ─────────────────────────────────────────────────────
    const onReading = async (packet) => {
      socket.emit('sensorReading', packet);

      // Check if an alert should be generated
      const { analysis, hmac, attackState } = packet;

      // Forcefully evaluate ANY active simulated attack as an absolute alert trigger
      const isSimulatedAttack = !!(attackState && attackState.type);
      const isAttack = analysis.isSpoofingDetected || hmac.isReplay || isSimulatedAttack;

      if (!isAttack) return;

      const isReplayEvent = hmac.isReplay || (attackState && attackState.type === 'REPLAY_ATTACK');
      const type = isReplayEvent ? 'REPLAY_ATTACK' : 'SENSOR_SPOOF';
      
      // Fallback to the attackState sensor if anomalyDetector missed the exact origin
      const sensorName = isReplayEvent ? 'MQTT Channel' : 
        (analysis.primaryAttack?.sensor || (attackState ? attackState.sensor : 'Unknown'));

      // Replays default to critical. Sensor spoofs use the score, but default to 'high' if forcefully triggered by the simulator.
      const severity = isReplayEvent ? 'critical' :
        (analysis.anomalyScore >= 80 ? 'critical' :
        analysis.anomalyScore >= 60 ? 'high' :
        analysis.anomalyScore >= 40 ? 'medium' :
        (isSimulatedAttack ? 'high' : 'low'));

      // Throttling Mechanism: Prevent alert spam for ongoing attacks
      const throttleKey = type === 'REPLAY_ATTACK' ? 'REPLAY_ATTACK' : `SENSOR_SPOOF_${sensorName}`;
      const now = Date.now();
      const lastTrigger = alertThrottleCache.get(throttleKey);

      if (lastTrigger && (now - lastTrigger < THROTTLE_WINDOW_MS)) {
        return; // Silently suppress redundant alerts during the cooldown window
      }

      // If cooldown passed or it's a new attack, update the cache and proceed
      alertThrottleCache.set(throttleKey, now);

      const title = isReplayEvent
        ? 'Replay Attack Detected'
        : `Sensor Spoof — ${sensorName.charAt(0).toUpperCase() + sensorName.slice(1)}`;

      const description = isReplayEvent
        ? `Duplicate HMAC-SHA256 signature detected. Packet timestamp: ${new Date(hmac.timestamp || Date.now()).toISOString()}`
        : `Cross-correlation anomaly on ${sensorName} sensor. Z-score: ${analysis.primaryAttack?.zScore?.toFixed(2)}. Neighbors flat (Δ < ${0.5}).`;

      const alertData = {
        type,
        severity,
        sensor: sensorName,
        title,
        description,
        anomalyScore: analysis.anomalyScore,
        details: {
          zScores: analysis.zScores,
          correlationMatrix: analysis.correlationMatrix,
          hmacStatus: hmac.status,
          windowSize: analysis.windowSize,
        },
        attackVector: analysis.primaryAttack ? {
          sensorAffected: analysis.primaryAttack.sensor,
          deviationZScore: analysis.primaryAttack.zScore,
          neighborZScore: analysis.primaryAttack.neighborZScore,
          hmacStatus: hmac.status,
          confidence: analysis.primaryAttack.confidence,
        } : {},
      };

      // Try to save to MongoDB; fall back to in-memory
      let savedAlert;
      if (mongoose.connection.readyState === 1) {
        try {
          savedAlert = await new Alert(alertData).save();
        } catch (err) {
          console.warn('  [Socket] Alert DB save failed:', err.message);
          savedAlert = { ...alertData, _id: require('uuid').v4(), createdAt: new Date() };
        }
      } else {
        savedAlert = { ...alertData, _id: require('uuid').v4(), createdAt: new Date() };
      }

      simulatorService.storeAlert(savedAlert);
      io.emit('newAlert', savedAlert);
    };

    simulatorService.on('reading', onReading);

    // ─── Client Commands ──────────────────────────────────────────────────────
    socket.on('triggerAttack', ({ type }) => {
      if (!['admin', 'operator'].includes(socket.userRole)) {
        return socket.emit('error', { message: 'Insufficient permissions' });
      }
      const success = simulatorService.triggerManualAttack(type);
      socket.emit('attackTriggered', { success, type });
    });

    socket.on('updateThreshold', ({ key, value }) => {
      if (socket.userRole !== 'admin') return;
      const anomalyDetector = require('../services/anomalyDetector');
      anomalyDetector.updateThreshold(key, value);
      io.emit('thresholdUpdated', { key, value });
    });

    socket.on('setTickRate', ({ ms }) => {
      if (socket.userRole !== 'admin') return;
      simulatorService.setTickRate(ms);
      io.emit('tickRateUpdated', { ms: simulatorService.tickRate });
    });

    socket.on('disconnect', () => {
      simulatorService.removeListener('reading', onReading);
      console.log(`  [Socket] Client disconnected: ${socket.id.slice(0, 8)}`);
    });
  });

  // ─── HARDWARE INTEGRATION INITIALIZATION ──────────────────────────────────────
  
  // simulatorService.start(); // <-- Kills the software random data generator
  simulatorService.setupMQTT();    // <-- Boots the hardware bridge
};