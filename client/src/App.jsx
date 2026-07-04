import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useStore from './store/useStore';
import { useSocket } from './hooks/useSocket';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Sensors from './pages/Sensors';
import Settings from './pages/Settings';

// Protected route wrapper
const Guard = ({ children }) => {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Socket initializer — only mounts when authenticated
const SocketBridge = () => {
  useSocket();
  return null;
};

export default function App() {
  const { isAuthenticated, token, setAuth } = useStore();

  // Re-hydrate auth from localStorage on refresh
  useEffect(() => {
    const storedToken = localStorage.getItem('sg_token');
    const storedUser = localStorage.getItem('sg_user');
    if (storedToken && storedUser && !isAuthenticated) {
      try {
        setAuth(JSON.parse(storedUser), storedToken);
      } catch {
        localStorage.removeItem('sg_token');
        localStorage.removeItem('sg_user');
      }
    }
  }, []);

  // Sync token to localStorage when it changes
  useEffect(() => {
    if (token) localStorage.setItem('sg_token', token);
  }, [token]);

  return (
    <div className="min-h-screen bg-transparent">
      {isAuthenticated && <SocketBridge />}

      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } />

          <Route path="/" element={
            <Guard><Layout /></Guard>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="sensors" element={<Sensors />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
