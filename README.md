# SensorGuard — Developer Setup Guide

## ⚙️ Prerequisites

- **Node.js:** v18 or newer
- **Mosquitto MQTT:** v2.0 or newer

## 🚀 First-Time Local Setup

To set up the project locally for the first time, you need to install the dependencies for both the backend and frontend. We do not commit `node_modules`, so this step is required.

1. **Install Root Dependencies** (Optional but recommended for concurrent scripts):
   ```bash
   npm install
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Variables:**
   You must set up the environment variables for the backend to function properly.
   ```bash
   cd ../server
   cp .env.example .env
   ```

## 📡 Mosquitto MQTT Configuration

**⚠️ CRUCIAL:** By default, Mosquitto v2.0+ only listens on the local loopback interface and requires authentication. To allow the Node.js backend and the ESP32 to connect during local development, you **MUST** modify your `mosquitto.conf` file.

1. Locate your `mosquitto.conf` file (e.g., `/etc/mosquitto/mosquitto.conf` on Linux, `/opt/homebrew/etc/mosquitto/mosquitto.conf` on macOS, or `C:\Program Files\mosquitto\mosquitto.conf` on Windows).
2. Add the following lines to the configuration file:
   ```text
   listener 1883 0.0.0.0
   allow_anonymous true
   ```
3. Restart the Mosquitto service so the new configuration takes effect.

## 🏃‍♂️ Running the Project

Once the dependencies are installed and the MQTT broker is configured and running, you can start the application stack.

1. **Start the Mosquitto MQTT Broker** (if it's not running as a background service):
   ```bash
   mosquitto -c /path/to/mosquitto.conf
   ```

2. **Start the Backend and Frontend** (from the root directory):
   ```bash
   npm run dev
   ```

3. **Access the Dashboard:**
   Open your browser and navigate to `http://localhost:5173`.
   - **Login Email:** admin@sensorguard.io
   - **Password:** Guard@2025

## 🧠 Architecture & Current State

We have officially transitioned into the **Hardware Integration & Polish** phase. The system is no longer purely a software simulation; it operates in a real physical environment using an ESP32 edge device wired to real sensors (Temperature, Humidity, LDR, KY-038) and a physical buzzer actuator.

### Handling Physical Reality
Because the system now operates in a real room, it is exposed to natural ambient noise (minor temperature shifts, shadows, background sound). To handle this, the backend math (`anomalyDetector.js`) has been overhauled:
- **Physical Deadbands:** Absolute tolerances are required to trigger a spoof. Minor fluctuations are ignored.
- **Variance Floor:** Statistical variance is floored at `1.0` to prevent micro-fluctuations from inflating the z-score.
- **Cross-Correlation Bypass:** Strict cross-correlation is bypassed. If any sensor clearly crosses the physical threshold, it guarantees an alert and triggers the physical buzzer.
- **Rapid UI Feedback:** Socket throttling in `socketHandler.js` has been dropped to `300ms` to provide near-instant feedback on the frontend when physical manipulations occur.

### Current Security Posture (For Devs)
While we finalize the C++ SHA-256 implementation on the ESP32, the hardware device is currently bypassing the HMAC validator by sending `"signature": "HARDWARE_BYPASS"` in its payload. The Node.js backend is configured to accept these unsigned packets temporarily so that testing and development can continue uninterrupted. This will be removed once the ESP32 cryptographic signing is fully implemented.