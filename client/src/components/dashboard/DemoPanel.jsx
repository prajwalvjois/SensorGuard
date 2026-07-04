import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronUp, ChevronDown, Thermometer, Droplets, Sun, RefreshCw, Repeat } from 'lucide-react';
import { triggerAttack } from '../../hooks/useSocket';
import clsx from 'clsx';

const ATTACKS = [
  {
    type: 'TEMPERATURE_SPOOF',
    label: 'Temp Spoof',
    icon: Thermometer,
    color: '#ff6b35',
    desc: 'Injects temperature anomaly while other sensors remain flat',
  },
  {
    type: 'HUMIDITY_SPOOF',
    label: 'Humid Spoof',
    icon: Droplets,
    color: '#22d9f5',
    desc: 'Spoofs humidity sensor with cross-correlation detection',
  },
  {
    type: 'LIGHT_SPOOF',
    label: 'Light Spoof',
    icon: Sun,
    color: '#ffd60a',
    desc: 'Simulates physical sensor tampering on LDR',
  },
  {
    type: 'REPLAY_ATTACK',
    label: 'Replay Attack',
    icon: Repeat,
    color: '#bf5af2',
    desc: 'Replays signed MQTT packet — HMAC-SHA256 detects duplicate',
  },
];

export default function DemoPanel() {
  const [open, setOpen] = useState(false);
  const [firing, setFiring] = useState(null);
  const [cooldown, setCooldown] = useState(false);

  const handleAttack = (type) => {
    if (cooldown) return;
    setFiring(type);
    triggerAttack(type);
    setCooldown(true);
    setTimeout(() => setFiring(null), 500);
    setTimeout(() => setCooldown(false), 3000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-14 right-0 w-72 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(11,17,32,0.97)',
              border: '1px solid rgba(255,59,59,0.2)',
              boxShadow: '0 0 30px rgba(255,59,59,0.1), 0 20px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,59,59,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <Zap size={13} color="#ff3b3b" />
                <span className="text-sm font-medium" style={{ color: '#ff6b6b' }}>
                  Demo Control Panel
                </span>
              </div>
              <span className="label-caps" style={{ color: '#ff6b6b', opacity: 0.6 }}>
                Evaluator Mode
              </span>
            </div>

            {/* Attack buttons */}
            <div className="p-3 space-y-2">
              {ATTACKS.map(({ type, label, icon: Icon, color, desc }) => (
                <motion.button
                  key={type}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: firing === type
                      ? `${color}20`
                      : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${firing === type ? color : 'rgba(255,255,255,0.05)'}`,
                    opacity: cooldown && firing !== type ? 0.5 : 1,
                    cursor: cooldown ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleAttack(type)}
                  whileTap={{ scale: 0.97 }}
                  disabled={cooldown}
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={13} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: firing === type ? color : '#e8eaf6' }}>
                        {label}
                      </span>
                      {firing === type && (
                        <RefreshCw size={10} color={color} className="animate-spin" />
                      )}
                    </div>
                    <p className="text-2xs text-ink-dim mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2.5"
              style={{ borderTop: '1px solid rgba(255,59,59,0.08)' }}
            >
              <p className="text-2xs text-ink-dim font-mono text-center">
                {cooldown ? '⏳ Cooldown 3s...' : 'Attacks visible in Attack Log in real-time'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        className={clsx(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
          'transition-all duration-200'
        )}
        style={{
          background: open ? 'rgba(255,59,59,0.15)' : 'rgba(255,59,59,0.1)',
          border: `1px solid rgba(255,59,59,${open ? 0.4 : 0.25})`,
          color: '#ff6b6b',
          boxShadow: open ? '0 0 20px rgba(255,59,59,0.2)' : 'none',
        }}
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Zap size={15} />
        <span>Attack Demo</span>
        {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </motion.button>
    </div>
  );
}
