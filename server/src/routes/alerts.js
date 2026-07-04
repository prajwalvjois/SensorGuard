const express = require('express');
const { protect } = require('../middleware/auth');
const { getAlerts, acknowledgeAlert, getAlertStats } = require('../controllers/alertController');
const simulatorService = require('../services/simulatorService');

const alertRouter = express.Router();
alertRouter.use(protect);
alertRouter.get('/', getAlerts);
alertRouter.get('/stats', getAlertStats);
alertRouter.patch('/:id/acknowledge', acknowledgeAlert);

const sensorRouter = express.Router();
sensorRouter.use(protect);

sensorRouter.get('/history', (req, res) => {
  res.json({ success: true, data: simulatorService.getHistory() });
});

sensorRouter.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      sessionId: simulatorService.sessionId,
      isRunning: simulatorService.isRunning,
      tickRate: simulatorService.tickRate,
      tickCount: simulatorService.tickCount,
      simulationMode: true,
    },
  });
});

sensorRouter.post('/trigger-attack', (req, res) => {
  const { type } = req.body;
  const validTypes = ['TEMPERATURE_SPOOF', 'HUMIDITY_SPOOF', 'LIGHT_SPOOF', 'REPLAY_ATTACK', 'SOUND_SPOOF'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid attack type' } });
  }
  const success = simulatorService.triggerManualAttack(type);
  res.json({ success, type, message: success ? 'Attack triggered' : 'Attack already active' });
});

module.exports = { alertRouter, sensorRouter };
