import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Wifi, AlertCircle, Lock, AtSign } from 'lucide-react';
import { authAPI } from '../utils/api';
import useStore from '../store/useStore';
import NetworkField from '../components/auth/NetworkField';

const DEFAULT_EMAIL = 'admin@sensorguard.io';
const DEFAULT_PASS  = 'Guard@2025';

export default function Login() {
  const { setAuth } = useStore();
  const [form, setForm]       = useState({ email: DEFAULT_EMAIL, password: DEFAULT_PASS });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [phase, setPhase]       = useState('idle'); // 'idle' | 'connecting' | 'authenticated'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPhase('connecting');

    try {
      const { data } = await authAPI.login(form);
      if (data.success) {
        setPhase('authenticated');
        localStorage.setItem('sg_token', data.token);
        localStorage.setItem('sg_user', JSON.stringify(data.user));
        // Small delay for the "authenticated" animation
        setTimeout(() => setAuth(data.user, data.token), 800);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Authentication failed. Check credentials.';
      setError(msg);
      setPhase('idle');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      {/* Three.js network background */}
      <NetworkField threatLevel={error ? 0.4 : 0} />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-white to-transparent pointer-events-none" style={{ zIndex: 1 }} />

      {/* Login card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4 mt-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 bg-white shadow-xl shadow-indigo-200/50 border border-white/80"
            animate={phase === 'authenticated' ? {
              background: ['#ffffff', '#ecfdf5'],
              borderColor: ['rgba(255,255,255,0.8)', 'rgba(52,211,153,0.4)'],
              boxShadow: ['0 20px 25px -5px rgba(199,210,254,0.5)', '0 20px 25px -5px rgba(167,243,208,0.5)']
            } : {}}
          >
            <Shield
              size={36}
              className={phase === 'authenticated' ? 'text-emerald-500' : 'text-indigo-600'}
              strokeWidth={2}
            />
          </motion.div>

          <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
            SensorGuard
          </h1>
          <p className="text-slate-500 font-medium text-lg">
            IoT Intrusion Detection Platform
          </p>

          {/* System status row */}
          <div className="flex items-center justify-center gap-4 mt-6 bg-white/60 p-2 rounded-xl border border-white/80 shadow-sm w-max mx-auto">
            <div className="flex items-center gap-2 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                Simulator Active
              </span>
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-2 px-3">
              <Wifi size={14} className="text-indigo-500" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                HMAC-SHA256
              </span>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div
          className="bg-white/70 backdrop-blur-2xl border border-white p-8 rounded-[2rem] shadow-2xl shadow-indigo-100/50"
        >
          <AnimatePresence mode="wait">
            {phase === 'authenticated' ? (
              <motion.div
                key="success"
                className="flex flex-col items-center py-6 gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="text-5xl text-emerald-500 font-bold mb-2">✓</div>
                <p className="text-xl font-bold text-emerald-600">Access Granted</p>
                <p className="text-sm text-slate-500 font-medium">Initialising secure session...</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Email field */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 block">Operator ID</label>
                  <div className="relative">
                    <AtSign
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500 rounded-xl py-3 pr-4 pl-11 outline-none transition-all placeholder-slate-400 font-medium"
                      placeholder="operator@sensorguard.io"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 block">Access Key</label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-white/50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500 rounded-xl py-3 pr-12 pl-11 outline-none transition-all placeholder-slate-400 font-medium"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="flex items-start gap-2.5 p-4 rounded-xl text-sm bg-rose-50 border border-rose-200 text-rose-700 font-medium"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    >
                      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl py-3.5 font-bold shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center text-base"
                >
                  {phase === 'connecting' ? (
                    <span className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Authenticating...
                    </span>
                  ) : (
                    'Access System'
                  )}
                </button>

                {/* Default credentials hint */}
                <p className="text-xs text-center text-slate-500 mt-6 font-medium">
                  Default: <span className="font-bold text-slate-700">admin@sensorguard.io</span> / <span className="font-bold text-slate-700">Guard@2025</span>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8 font-mono font-bold uppercase tracking-widest">
          SensorGuard v1.0 · IDEA Lab EL Project · AY 2025–26
        </p>
      </motion.div>
    </div>
  );
}
