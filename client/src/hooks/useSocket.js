import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useStore from '../store/useStore';

const SOCKET_URL = 'http://localhost:3000';

let socketInstance = null;

export const useSocket = () => {
  const socketRef = useRef(null);
  const {
    token, isAuthenticated,
    setConnected, setConnectionStatus,
    updateReading, setHistory,
    addAlert, setInitialAlerts,
  } = useStore();

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error:', err.message);
      setConnectionStatus('error');
    });

    socket.on('reconnecting', () => setConnectionStatus('connecting'));
    socket.on('reconnect', () => setConnected(true));

    // ─── Data Events ────────────────────────────────────────────────────
    socket.on('sensorReading', (packet) => {
      updateReading(packet);
    });

    socket.on('sensorHistory', (history) => {
      setHistory(history);
    });

    socket.on('newAlert', (alert) => {
      addAlert(alert);
    });

    socket.on('initialAlerts', (alerts) => {
      setInitialAlerts(alerts);
    });

    return socket;
  }, [isAuthenticated, token, setConnected, setConnectionStatus, updateReading, setHistory, addAlert, setInitialAlerts]);

  useEffect(() => {
    const socket = connect();
    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketInstance = null;
      }
    };
  }, [connect]);

  return socketRef;
};

/**
 * Emit events to the server from anywhere in the app.
 * Use via getSocket().emit(...) outside of React components.
 */
export const getSocket = () => socketInstance;

/**
 * Trigger an attack from the demo control panel.
 */
export const triggerAttack = (type) => {
  socketInstance?.emit('triggerAttack', { type });
};

/**
 * Update anomaly detection thresholds.
 */
export const updateThreshold = (key, value) => {
  socketInstance?.emit('updateThreshold', { key, value });
};

export const setTickRate = (ms) => {
  socketInstance?.emit('setTickRate', { ms });
};

