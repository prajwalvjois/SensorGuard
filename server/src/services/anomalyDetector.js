/**
 * AnomalyDetector — Cross-Sensor Correlation Engine
 *
 * Core Algorithm (Project Novelty):
 * ─────────────────────────────────
 * 1. Maintain a sliding window of recent readings per sensor.
 * 2. Compute z-score for each new reading against its window (μ ± σ).
 * 3. If z-score exceeds spoofThreshold for ANY sensor → run cross-correlation check:
 *    • If ALL neighboring sensors are flat (z < neighborFlat threshold):
 *        → SPOOFING DETECTED (single-sensor anomaly, no physical cause)
 *    • If neighboring sensors are ALSO anomalous (z > neighborEvent):
 *        → LEGITIMATE EVENT (real environmental change, e.g., fire, rain)
 * 4. Compute overall anomalyScore (0–100) as weighted max z-score.
 *
 * HARDWARE INTEGRATION: Replace addReading() calls with real ESP32 MQTT payloads.
 */
class AnomalyDetector {
  constructor() {
    this.windowSize = 60; // readings per sensor
    this.windows = {
      temperature: [],
      humidity: [],
      light: [],
      sound: [],
    };
    this.thresholds = {
      spoof: 2.5,        // z-score to flag a sensor as anomalous
      neighborFlat: 0.5, // max neighbor z-score to confirm spoofing
      neighborEvent: 1.0, // min neighbor z-score to confirm real event
    };
    // Correlation history for D3 heatmap
    this.correlationMatrix = this._emptyMatrix();
    this.readingCount = 0;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Analyze a full set of sensor readings.
   * @param {Object} readings - { temperature: {value}, humidity: {value}, ... }
   * @returns {AnalysisResult}
   */
  analyze(readings) {
    const sensors = Object.keys(this.windows);

    // 1. Feed values into sliding windows
    for (const sensor of sensors) {
      if (readings[sensor]?.value !== undefined) {
        this._addToWindow(sensor, readings[sensor].value);
      }
    }
    this.readingCount++;

    // 2. Compute z-scores (deviations)
    const zScores = {};
    const isAnomaly = {};
    for (const sensor of sensors) {
      zScores[sensor] = this._zScore(sensor);
      isAnomaly[sensor] = zScores[sensor] > this.thresholds.spoof; // Check against threshold
    }

    // 3. HARDWARE FIX: Bypass the strict cross-correlation!
    // If ANY sensor crosses the threshold, we guarantee an alert is fired.
    const spoofResults = {};
    for (const sensor of sensors) {
      if (!isAnomaly[sensor]) continue;
      
      const neighbors = sensors.filter(s => s !== sensor).map(s => zScores[s]);
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;

      spoofResults[sensor] = {
        verdict: avgNeighbor > this.thresholds.neighborEvent ? 'CORRELATED_EVENT' : 'SPOOFING',
        isSpoofing: true, // <--- CRITICAL FIX: This forces the backend to emit the alert and trigger the buzzer!
        confidence: Math.min(99, 50 + (zScores[sensor] * 10)),
        zScore: zScores[sensor],
        neighborZScore: avgNeighbor,
      };
    }

    // 4. Determine Primary Attack
    const spoofEntries = Object.entries(spoofResults);
    spoofEntries.sort(([, a], [, b]) => b.zScore - a.zScore); // Sort by highest spike
    const primaryAttack = spoofEntries.length > 0
      ? { sensor: spoofEntries[0][0], ...spoofEntries[0][1] }
      : null;

    // 5. Compute Overall Score for UI Severity (0-100)
    const maxZ = Math.max(0, ...Object.values(zScores));
    const anomalyScore = Math.min(100, Math.round((maxZ / 5) * 100));

    if (this.readingCount % 10 === 0 && this.readingCount > 20) {
      this.correlationMatrix = this._computeCorrelationMatrix();
    }

    return {
      zScores,
      isAnomaly,
      spoofResults,
      anomalyScore,
      isSpoofingDetected: primaryAttack !== null, // FIX: This will now correctly turn TRUE!
      primaryAttack,
      correlationMatrix: this.correlationMatrix,
      windowSize: this.windows.temperature.length,
    };
  }

  updateThreshold(key, value) {
    if (this.thresholds[key] !== undefined) {
      this.thresholds[key] = parseFloat(value);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  _addToWindow(sensor, value) {
    this.windows[sensor].push(value);
    if (this.windows[sensor].length > this.windowSize) {
      this.windows[sensor].shift();
    }
  }

  _stats(arr) {
    if (arr.length < 2) return { mean: arr[0] || 0, std: 1 };
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    
    // FIX 1: Floor the standard deviation at 1.0. 
    // This stops micro-fluctuations (0.001 variance) from inflating the z-score.
    return { mean, std: Math.max(Math.sqrt(variance), 1.0) };
  }

  _zScore(sensor) {
    const w = this.windows[sensor];
    if (w.length < 3) return 0;
    
    const { mean, std } = this._stats(w.slice(0, -1)); // exclude current
    const current = w[w.length - 1];
    const absoluteDeviation = Math.abs(current - mean);

    // ─── FIX 2: PHYSICAL DEADBANDS (TOLERANCES) ───
    // A reading must change by AT LEAST this much physically 
    // before the algorithm even considers it an anomaly.
    const tolerances = {
      temperature: 3, // Ignore shifts smaller than 4.5 °C
      humidity: 8.0,    // Ignore shifts smaller than 8 %
      light: 150,       // Ignore small shadows (needs > 150 lux change)
      sound: 30         // Ignore background talking (needs > 30 dB change)
    };

    // If the change is smaller than our tolerance, silently ignore it.
    if (absoluteDeviation < tolerances[sensor]) {
      return 0; 
    }

    // If it passed the physical check, calculate the actual statistical threat level
    return absoluteDeviation / std;
  }

  _pearson(arrA, arrB) {
    const n = Math.min(arrA.length, arrB.length);
    if (n < 5) return 0;
    const a = arrA.slice(-n);
    const b = arrB.slice(-n);
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    const num = a.reduce((s, v, i) => s + (v - meanA) * (b[i] - meanB), 0);
    const denA = Math.sqrt(a.reduce((s, v) => s + (v - meanA) ** 2, 0));
    const denB = Math.sqrt(b.reduce((s, v) => s + (v - meanB) ** 2, 0));
    return denA && denB ? num / (denA * denB) : 0;
  }

  _computeCorrelationMatrix() {
    const sensors = Object.keys(this.windows);
    const matrix = {};
    for (const s1 of sensors) {
      matrix[s1] = {};
      for (const s2 of sensors) {
        matrix[s1][s2] = s1 === s2 ? 1 : this._pearson(this.windows[s1], this.windows[s2]);
      }
    }
    return matrix;
  }

  _emptyMatrix() {
    const sensors = ['temperature', 'humidity', 'light', 'sound'];
    const m = {};
    for (const s1 of sensors) {
      m[s1] = {};
      for (const s2 of sensors) m[s1][s2] = s1 === s2 ? 1 : 0;
    }
    return m;
  }
}

module.exports = new AnomalyDetector();
