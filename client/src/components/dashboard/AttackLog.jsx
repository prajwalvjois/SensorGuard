import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Filter, CheckCheck, AlertOctagon, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import useStore from '../../store/useStore';
import clsx from 'clsx';

const SEVERITY_STYLE = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', prefix: '██ CRIT', dim: 'rgba(239, 68, 68, 0.2)' },
  high:     { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', prefix: '▓▓ HIGH', dim: 'rgba(249, 115, 22, 0.2)' },
  medium:   { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', prefix: '▒▒  MED', dim: 'rgba(245, 158, 11, 0.2)' },
  low:      { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', prefix: '░░  LOW', dim: 'rgba(16, 185, 129, 0.2)' },
  info:     { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', prefix: '── INFO', dim: 'rgba(100, 116, 139, 0.2)' },
};

const TYPE_ABBREV = {
  SENSOR_SPOOF:      'SPOOF',
  REPLAY_ATTACK:     'REPLAY',
  DATA_INJECTION:    'INJECT',
  THRESHOLD_BREACH:  'THRESH',
  SYSTEM:            'SYS',
};

function AlertRow({ alert, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const s = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;
  const ts = alert.createdAt ? format(new Date(alert.createdAt), 'HH:mm:ss') : '--:--:--';
  const ago = alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : '';

  return (
    <motion.div
      className="rounded-lg overflow-hidden cursor-pointer"
      style={{
        background: expanded ? s.bg : 'transparent',
        border: `1px solid ${expanded ? s.dim : 'transparent'}`,
        marginBottom: 2,
      }}
      initial={isNew ? { x: 20, opacity: 0, backgroundColor: `${s.color}20` } : false}
      animate={{ x: 0, opacity: 1, backgroundColor: 'transparent' }}
      transition={{ duration: 0.3 }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div className="flex items-start gap-2 px-2 py-1.5">
        {/* Expand icon */}
        <span className="text-slate-400 mt-0.5 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Timestamp */}
        <span className="font-mono text-xs text-slate-500 flex-shrink-0 w-16 mt-0.5">{ts}</span>

        {/* Severity prefix */}
        <span
          className="font-mono text-xs font-bold flex-shrink-0 w-16"
          style={{ color: s.color }}
        >
          {s.prefix}
        </span>

        {/* Type tag */}
        <span
          className="font-mono text-xs font-semibold flex-shrink-0 px-1 rounded"
          style={{ background: `${s.color}18`, color: s.color }}
        >
          {TYPE_ABBREV[alert.type] || alert.type}
        </span>

        {/* Description */}
        <span className="text-xs text-slate-600 flex-1 leading-relaxed line-clamp-1 font-mono">
          {alert.title || alert.description}
        </span>

        {/* Score */}
        {alert.anomalyScore != null && (
          <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: s.color }}>
            [{alert.anomalyScore.toFixed(0)}]
          </span>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="px-3 pb-3 pt-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="p-3 rounded-lg font-mono text-xs space-y-1.5 bg-slate-50 border border-slate-200 shadow-inner"
            >
              <div className="flex gap-2">
                <span className="text-slate-500 font-semibold w-24 flex-shrink-0">SENSOR</span>
                <span style={{ color: s.color }} className="font-bold">{alert.sensor || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 font-semibold w-24 flex-shrink-0">ANOMALY</span>
                <span style={{ color: s.color }} className="font-bold">{alert.anomalyScore?.toFixed(1)}/100</span>
              </div>
              {alert.attackVector?.deviationZScore && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-semibold w-24 flex-shrink-0">Z-SCORE</span>
                  <span className="text-slate-700">{alert.attackVector.deviationZScore.toFixed(3)}σ</span>
                </div>
              )}
              {alert.attackVector?.confidence && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-semibold w-24 flex-shrink-0">CONFIDENCE</span>
                  <span className="text-slate-700">{alert.attackVector.confidence.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-slate-500 font-semibold w-24 flex-shrink-0">HMAC</span>
                <span className={alert.attackVector?.hmacStatus === 'REPLAYED' ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                  {alert.attackVector?.hmacStatus || 'VALID'}
                </span>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-semibold w-24 flex-shrink-0">DESCRIPTION</span>
                <span className="text-slate-600 leading-relaxed">{alert.description}</span>
              </div>
              <div className="text-slate-400 mt-2 font-sans italic text-xs">{ago}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const FILTERS = ['all', 'critical', 'high', 'medium', 'SENSOR_SPOOF', 'REPLAY_ATTACK'];

export default function AttackLog({ maxHeight = 420 }) {
  const { alerts } = useStore();
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [newIds, setNewIds] = useState(new Set());
  const scrollRef = useRef(null);
  const prevCountRef = useRef(0);

  // Track new alerts for animation
  useEffect(() => {
    if (alerts.length > prevCountRef.current) {
      const newSet = new Set(alerts.slice(0, alerts.length - prevCountRef.current).map(a => a._id));
      setNewIds(newSet);
      setTimeout(() => setNewIds(new Set()), 2000);
    }
    prevCountRef.current = alerts.length;
  }, [alerts.length]);

  // Auto-scroll to top (newest)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alerts.length, autoScroll]);

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (filter === 'all') return true;
      if (['critical', 'high', 'medium', 'low'].includes(filter)) return a.severity === filter;
      return a.type === filter;
    });
  }, [alerts, filter]);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6 flex flex-col max-h-96">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200/60 pb-3">
        <h2 className="text-slate-800 font-extrabold text-xl flex-1">Event Log</h2>
        
        {alerts.length > 0 && (
          <span className="flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-600">
            {alerts.length > 99 ? '99+' : alerts.length} events
          </span>
        )}
        <button
          className={clsx('flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ml-2',
            autoScroll ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600')}
          onClick={() => setAutoScroll(!autoScroll)}
          title="Toggle auto-scroll to latest"
        >
          <ChevronDown size={14} /> Live
        </button>
      </div>

      {/* Filter row */}
      <div
        className="flex items-center gap-1 px-3 py-3 overflow-x-auto flex-shrink-0 border-b border-slate-200/60"
      >
        <Filter size={14} className="text-slate-400 flex-shrink-0 mr-1" />
        {FILTERS.map(f => (
          <button
            key={f}
            className={clsx(
              'px-2 py-1 rounded text-xs font-mono uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 border',
              filter === f
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
            )}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
        onScroll={(e) => {
          // Disable auto-scroll if user manually scrolls down
          if (e.target.scrollTop > 20) setAutoScroll(false);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertOctagon size={24} className="text-slate-300" />
            <p className="text-xs text-slate-400 font-mono">
              {alerts.length === 0 ? 'Awaiting events...' : 'No events match filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((alert) => (
              <AlertRow
                key={alert._id}
                alert={alert}
                isNew={newIds.has(alert._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-500">{filtered.length} events shown</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[10px]">Active</span>
        </div>
      </div>
    </div>
  );
}
