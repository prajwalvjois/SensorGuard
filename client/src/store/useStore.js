import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_HISTORY = 120;

// ─── Auth Slice ───────────────────────────────────────────────────────────────
const createAuthSlice = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  clearAuth: () => {
    localStorage.removeItem('sg_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
});

// ─── Connection Slice ─────────────────────────────────────────────────────────
const createConnectionSlice = (set) => ({
  isConnected: false,
  connectionStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected' | 'error'
  lastHeartbeat: null,
  setConnected: (val) =>
    set({ isConnected: val, connectionStatus: val ? 'connected' : 'disconnected', lastHeartbeat: Date.now() }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
});

// ─── Sensor Slice ─────────────────────────────────────────────────────────────
const createSensorSlice = (set, get) => ({
  latestReading: null,
  sensorHistory: { temperature: [], humidity: [], light: [], sound: [] },
  anomalyScore: 0,
  activeAttack: null,
  zScores: {},
  correlationMatrix: null,
  hmacStatus: 'VALID',
  tickCount: 0,

  updateReading: (packet) => {
    const { sensors, analysis, attackState, hmac } = packet;
    const prev = get().sensorHistory;

    // Append new point to each sensor's history array
    const newHistory = { ...prev };
    for (const [sensor, data] of Object.entries(sensors)) {
      const point = {
        value: data.value,
        timestamp: packet.timestamp,
        isAnomaly: analysis.isAnomaly?.[sensor] || false,
      };
      newHistory[sensor] = [...(prev[sensor] || []).slice(-MAX_HISTORY + 1), point];
    }

    set({
      latestReading: packet,
      sensorHistory: newHistory,
      anomalyScore: analysis.anomalyScore,
      activeAttack: attackState,
      zScores: analysis.zScores || {},
      correlationMatrix: analysis.correlationMatrix,
      hmacStatus: hmac.status,
      tickCount: get().tickCount + 1,
    });
  },

  setHistory: (history) => {
    // Convert raw history arrays to point arrays
    const normalized = {};
    for (const [sensor, points] of Object.entries(history)) {
      normalized[sensor] = points.slice(-MAX_HISTORY);
    }
    set({ sensorHistory: normalized });
  },
});

// ─── Alert Slice ──────────────────────────────────────────────────────────────
const createAlertSlice = (set, get) => ({
  alerts: [],
  unreadCount: 0,
  stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },

  addAlert: (alert) => {
    const alerts = [alert, ...get().alerts.slice(0, 199)];
    const stats = { ...get().stats };
    stats.total++;
    if (stats[alert.severity] !== undefined) stats[alert.severity]++;
    set({ alerts, unreadCount: get().unreadCount + 1, stats });
  },

  setInitialAlerts: (alerts) => {
    const stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      stats.total++;
      if (stats[a.severity] !== undefined) stats[a.severity]++;
    }
    set({ alerts, stats });
  },

  markAllRead: () => set({ unreadCount: 0 }),
  clearAlerts: () => set({ alerts: [], unreadCount: 0, stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } }),
});

// ─── UI Slice ─────────────────────────────────────────────────────────────────
const createUISlice = (set) => ({
  sidebarExpanded: false,
  setSidebarExpanded: (val) => set({ sidebarExpanded: val }),
  attackPanelOpen: false,
  setAttackPanelOpen: (val) => set({ attackPanelOpen: val }),
});

// ─── Combined Store ───────────────────────────────────────────────────────────
const useStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set),
      ...createConnectionSlice(set),
      ...createSensorSlice(set, get),
      ...createAlertSlice(set, get),
      ...createUISlice(set),
    }),
    {
      name: 'sg-store',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useStore;
