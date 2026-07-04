const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const hmacService = require('./hmacService');
const anomalyDetector = require('./anomalyDetector');

/**
 * SimulatorService — Hardware Abstraction Layer (Simulation Mode)
 *
 * Generates realistic IoT sensor data using Ornstein-Uhlenbeck stochastic process
 * (mean-reverting random walk) and injects periodic spoofing attacks.
 *
 * HARDWARE INTEGRATION (when ESP32 arrives):
 * ─────────────────────────────────────────
 * 1. Comment out `start()` / `tick()` loop.
 * 2. Uncomment MqttClient setup below.
 * 3. In the MQTT message handler, call:
 *      anomalyDetector.analyze(parsedPayload)
 *      hmacService.verify(...)
 *      this.emit('reading', packet)
 * 4. The rest of the system (Socket.io, DB, frontend) remains identical.
 */
class SimulatorService extends EventEmitter {
  constructor() {
    super();
    this.sessionId = uuidv4();
    this.isRunning = false;
    this.tickInterval = null;
    this.tickRate = 2000; // ms between readings
    this.tickCount = 0;

    // Baseline (mean-reversion targets)
    this.baselines = { temperature: 26.0, humidity: 62.0, light: 820, sound: 42 };
    this.current = { ...this.baselines };

    // In-memory stores (fallback when DB unavailable)
    this.inMemoryAlerts = [];
    this.history = { temperature: [], humidity: [], light: [], sound: [] };
    this.maxHistory = 300;

    // Attack state machine
    this.attack = { active: false, type: null, sensor: null, elapsed: 0, duration: 0, id: null };
    this.nextAttackTick = this._randomAttackInterval();

    // Store recent packets for replay attack simulation
    this.recentPackets = [];
    this.maxRecentPackets = 30;
  }

  // ─── HARDWARE INTEGRATION STUB ───────────────────────────────────────────────
  // Uncomment and configure when ESP32 MQTT bridge is ready:
  //
  // setupMQTT() {
  //   const mqtt = require('mqtt');
  //   this.mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost:1883');
  //   this.mqttClient.subscribe('sensorguard/readings');
  //   this.mqttClient.on('message', (topic, message) => {
  //     const payload = JSON.parse(message.toString());
  //     const hmacResult = hmacService.verify(
  //       payload.sensors, payload.signature, payload.timestamp, payload.nonce
  //     );
  //     const analysis = anomalyDetector.analyze(payload.sensors);
  //     const packet = this._buildPacket(payload.sensors, analysis, hmacResult, false);
  //     this.emit('reading', packet);
  //   });
  // }
  // ─────────────────────────────────────────────────────────────────────────────


  setupMQTT() {
    const mqtt = require('mqtt');
    
    // Connect to local broker
    this.mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://127.0.0.1:1883');
    
    this.mqttClient.on('connect', () => {
      console.log('🔗 MQTT Bridge Connected to Physical Hardware');
      this.mqttClient.subscribe('sensors/telemetry');
    });

    this.mqttClient.on('message', (topic, message) => {
      if (topic === 'sensors/telemetry') {
        try {
          const payload = JSON.parse(message.toString());
          const readings = payload.sensors;
          
          // Hardware Bypass for HMAC (since ESP32 isn't hashing yet)
          let hmacResult = { valid: true, replayed: false, status: 'VALID', reason: 'OK' };
          if (payload.signature !== "HARDWARE_BYPASS") {
            hmacResult = hmacService.verify(readings, payload.signature, payload.timestamp, payload.nonce);
          }
          
          const analysis = anomalyDetector.analyze(readings);
          
          // CRITICAL FIX: Update History for frontend charts
          for (const [sensor, data] of Object.entries(readings)) {
            this.history[sensor].push({
              value: data.value,
              timestamp: Date.now(),
              isAnomaly: analysis.isAnomaly[sensor] || false,
            });
            if (this.history[sensor].length > this.maxHistory) this.history[sensor].shift();
          }

          const packet = this._buildPacket(readings, analysis, hmacResult, payload);
          
          // Actuator Logic
          if (analysis.isSpoofingDetected || hmacResult.replayed) {
            this.mqttClient.publish('sensors/actuators', 'TRIGGER_BUZZER');
          }
          
          this.emit('reading', packet);
          
        } catch (error) {
          console.error("MQTT Parsing Error:", error.message);
        }
      }
    });
  }

  _buildPacket(sensors, analysis, hmacResult, payload) {
    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sensors,
      analysis,
      hmac: {
        signaturePreview: payload.signature || "hardware_device_sig...",
        timestamp: payload.timestamp || Date.now(),
        nonce: payload.nonce || 0,
        status: hmacResult.status,
        isReplay: hmacResult.replayed,
        reason: hmacResult.reason,
      },
      attackState: null,
      simulationMode: false, 
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tickInterval = setInterval(() => this._tick(), this.tickRate);
    console.log(`  [Simulator] Session ${this.sessionId.slice(0, 8)} started @ ${this.tickRate}ms/tick`);
  }

  stop() {
    clearInterval(this.tickInterval);
    this.isRunning = false;
  }

  triggerManualAttack(type) {
    if (this.attack.active) return false;
    const sensorMap = {
      TEMPERATURE_SPOOF: 'temperature',
      HUMIDITY_SPOOF: 'humidity',
      LIGHT_SPOOF: 'light',
      SOUND_SPOOF: 'sound',
      REPLAY_ATTACK: null,
    };
    this.attack = {
      active: true,
      type,
      sensor: sensorMap[type] ?? null,
      elapsed: 0,
      duration: 5 + Math.floor(Math.random() * 4),
      id: uuidv4(),
      manual: true,
    };
    this.emit('attackStarted', { type, sensor: this.attack.sensor, id: this.attack.id });
    return true;
  }

  setTickRate(ms) {
    this.tickRate = Math.max(500, Math.min(10000, ms));
    if (this.isRunning) {
      clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => this._tick(), this.tickRate);
    }
  }

  getHistory() {
    return this.history;
  }

  getInMemoryAlerts(limit = 50) {
    return this.inMemoryAlerts.slice(0, limit);
  }

  storeAlert(alert) {
    this.inMemoryAlerts.unshift(alert);
    if (this.inMemoryAlerts.length > 200) this.inMemoryAlerts.pop();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _tick() {
    this.tickCount++;

    // Natural Ornstein-Uhlenbeck drift per sensor
    const drift = { temperature: 0.3, humidity: 1.2, light: 35, sound: 2.5 };
    for (const [sensor, baseline] of Object.entries(this.baselines)) {
      const theta = 0.06; // mean-reversion speed
      const d = -theta * (this.current[sensor] - baseline);
      const noise = (Math.random() - 0.5) * drift[sensor];
      this.current[sensor] += d + noise;
    }

    // Schedule next attack
    if (!this.attack.active && this.tickCount >= this.nextAttackTick) {
      this._initRandomAttack();
    }

    // Apply attack distortion
    let isReplay = false;
    let hmacResult = { valid: true, replayed: false, reason: 'OK', status: 'VALID' };
    const readings = this._buildReadings();

    if (this.attack.active) {
      this.attack.elapsed++;

      if (this.attack.type === 'REPLAY_ATTACK') {
        isReplay = true;
        const replayTarget = hmacService.simulateReplay();
        if (replayTarget) {
          hmacResult = { valid: true, replayed: true, reason: 'REPLAY_DETECTED', status: 'REPLAYED' };
        }
      } else if (this.attack.sensor) {
        const magnitude = this._attackMagnitude(this.attack.sensor);
        const direction = Math.random() > 0.5 ? 1 : -1;
        readings[this.attack.sensor].value = parseFloat(
          (this.current[this.attack.sensor] + direction * magnitude).toFixed(2)
        );
      }

      if (this.attack.elapsed >= this.attack.duration) {
        this.emit('attackEnded', { type: this.attack.type });
        this.attack = { active: false, type: null, sensor: null, elapsed: 0, duration: 0, id: null };
        this.nextAttackTick = this.tickCount + this._randomAttackInterval();
      }
    }

    // HMAC sign packet
    const { signature, timestamp, nonce } = hmacService.sign(readings);
    if (!isReplay) {
      this.recentPackets.unshift({ signature, timestamp });
      if (this.recentPackets.length > this.maxRecentPackets) this.recentPackets.pop();
    }

    // Run analysis
    const analysis = anomalyDetector.analyze(readings);

    // Update history
    for (const [sensor, data] of Object.entries(readings)) {
      this.history[sensor].push({
        value: data.value,
        timestamp: Date.now(),
        isAnomaly: analysis.isAnomaly[sensor] || false,
      });
      if (this.history[sensor].length > this.maxHistory) this.history[sensor].shift();
    }

    const packet = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sensors: readings,
      analysis,
      hmac: {
        signaturePreview: signature.slice(0, 16) + '...' + signature.slice(-8),
        timestamp,
        nonce,
        status: hmacResult.status,
        isReplay: hmacResult.replayed,
        reason: hmacResult.reason,
      },
      attackState: this.attack.active
        ? { type: this.attack.type, sensor: this.attack.sensor, elapsed: this.attack.elapsed, id: this.attack.id }
        : null,
      simulationMode: true,
    };

    this.emit('reading', packet);
    return packet;
  }

  _buildReadings() {
    return {
      temperature: { value: parseFloat(this.current.temperature.toFixed(2)), unit: '°C' },
      humidity:    { value: parseFloat(this.current.humidity.toFixed(2)), unit: '%' },
      light:       { value: parseFloat(this.current.light.toFixed(1)), unit: 'lux' },
      sound:       { value: parseFloat(this.current.sound.toFixed(1)), unit: 'dB' },
    };
  }

  _attackMagnitude(sensor) {
    const ranges = { temperature: [8, 18], humidity: [18, 30], light: [400, 900], sound: [20, 40] };
    const [min, max] = ranges[sensor] || [5, 15];
    return min + Math.random() * (max - min);
  }

  _initRandomAttack() {
    const attacks = [
      { type: 'TEMPERATURE_SPOOF', sensor: 'temperature' },
      { type: 'HUMIDITY_SPOOF', sensor: 'humidity' },
      { type: 'LIGHT_SPOOF', sensor: 'light' },
      { type: 'REPLAY_ATTACK', sensor: null },
    ];
    const chosen = attacks[Math.floor(Math.random() * attacks.length)];
    this.attack = {
      active: true,
      type: chosen.type,
      sensor: chosen.sensor,
      elapsed: 0,
      duration: 4 + Math.floor(Math.random() * 5),
      id: uuidv4(),
      manual: false,
    };
    this.emit('attackStarted', { type: chosen.type, sensor: chosen.sensor, id: this.attack.id });
  }

  _randomAttackInterval() {
    // Random interval between 20–60 ticks from now
    return this.tickCount + 20 + Math.floor(Math.random() * 40);
  }
}

module.exports = new SimulatorService();
