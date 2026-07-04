const crypto = require('crypto');

/**
 * HMACService — Signs sensor packets and detects replay attacks.
 * Uses a sliding time-window to track seen signatures.
 * HARDWARE INTEGRATION: Replace generatePacket() with MQTT packet handler.
 */
class HMACService {
  constructor() {
    this.secret = process.env.HMAC_SECRET || 'sensorguard-hmac-secret-2025';
    this.replayWindowMs = 5 * 60 * 1000; // 5-minute replay window
    this.seenSignatures = new Map(); // signature → timestamp

    // Prune stale signatures every 60 seconds
    setInterval(() => this._pruneWindow(), 60 * 1000);
  }

  /**
   * Signs a sensor payload and returns { signature, timestamp, nonce }.
   */
  sign(payload) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(8).toString('hex');
    const message = JSON.stringify({ ...payload, timestamp, nonce });
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');
    return { signature, timestamp, nonce, message };
  }

  /**
   * Verifies a packet signature and checks for replay.
   * Returns { valid, replayed, reason }.
   */
  verify(payload, signature, timestamp, nonce) {
    // Reconstruct expected signature
    const message = JSON.stringify({ ...payload, timestamp, nonce });
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');

    let valid = false;
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch {
      return { valid: false, replayed: false, reason: 'MALFORMED_SIGNATURE' };
    }

    if (!valid) return { valid: false, replayed: false, reason: 'INVALID_SIGNATURE' };

    // Timestamp freshness check
    if (Date.now() - timestamp > this.replayWindowMs) {
      return { valid: false, replayed: false, reason: 'EXPIRED_TIMESTAMP' };
    }

    // Replay check — same signature seen before?
    if (this.seenSignatures.has(signature)) {
      return { valid: true, replayed: true, reason: 'REPLAY_DETECTED' };
    }

    this.seenSignatures.set(signature, Date.now());
    return { valid: true, replayed: false, reason: 'OK' };
  }

  /**
   * Simulate a replay attack by returning an already-seen signature.
   * Used by SimulatorService for demo purposes.
   */
  simulateReplay() {
    const entries = [...this.seenSignatures.entries()];
    if (entries.length === 0) return null;
    const randomEntry = entries[Math.floor(Math.random() * Math.min(entries.length, 10))];
    return { signature: randomEntry[0], originalTimestamp: randomEntry[1] };
  }

  _pruneWindow() {
    const cutoff = Date.now() - this.replayWindowMs;
    for (const [sig, ts] of this.seenSignatures) {
      if (ts < cutoff) this.seenSignatures.delete(sig);
    }
  }
}

module.exports = new HMACService();
