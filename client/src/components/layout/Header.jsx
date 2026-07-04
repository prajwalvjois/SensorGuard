import { useLocation } from 'react-router-dom';
import { Bell, Wifi, WifiOff, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

const pathLabels = {
  '/dashboard':  'Overview',
  '/sensors':    'Sensor Management',
  '/alerts':     'Alert Log',
  '/analytics':  'Analytics',
  '/settings':   'Settings',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-sm font-medium text-slate-500">
      {format(time, 'HH:mm:ss')} <span className="mx-1 text-slate-300">|</span> {format(time, 'dd MMM yyyy')}
    </span>
  );
}

export default function Header() {
  const location = useLocation();
  const { isConnected, connectionStatus, anomalyScore, unreadCount, markAllRead, user } = useStore();
  const [showAlerts, setShowAlerts] = useState(false);

  const pageTitle = pathLabels[location.pathname] || 'SensorGuard';
  const scoreColor = anomalyScore > 70 ? 'text-rose-500' : anomalyScore > 40 ? 'text-amber-500' : 'text-emerald-500';
  const scoreBg = anomalyScore > 70 ? 'bg-rose-50 border-rose-100' : anomalyScore > 40 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100';

  return (
    <header
      className="fixed top-0 right-0 left-64 h-24 bg-white border-b border-slate-200 z-30 px-6 flex items-center justify-between"
    >
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold tracking-widest uppercase text-slate-400">SensorGuard</span>
        <span className="text-slate-300 font-light">/</span>
        <span className="text-lg font-bold text-slate-800">{pageTitle}</span>
      </div>

      {/* Right: Status cluster */}
      <div className="flex items-center gap-6">
        <LiveClock />

        {/* Anomaly score chip */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border ${scoreBg} ${scoreColor}`}>
          <Activity size={16} />
          <span>{anomalyScore.toFixed(0)}</span>
          <span className="opacity-50 text-xs font-medium">/ 100</span>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/80 shadow-sm">
          {isConnected ? (
            <Wifi size={16} className="text-emerald-500" />
          ) : (
            <WifiOff size={16} className="text-rose-500 animate-pulse" />
          )}
          <span className={`text-xs font-bold tracking-wider font-mono uppercase ${isConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isConnected ? 'LIVE' : connectionStatus}
          </span>
        </div>

        {/* Alert bell */}
        <button
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 text-slate-500 hover:text-slate-800 hover:bg-white transition-all border border-white/80 shadow-sm cursor-pointer"
          onClick={() => { setShowAlerts(!showAlerts); if (!showAlerts) markAllRead(); }}
        >
          <Bell size={18} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/60 border border-white/80 shadow-sm cursor-default">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate leading-tight">
              {user?.email?.split('@')[0] || 'admin'}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-tight">
              {user?.role || 'admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
