import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Activity, AlertTriangle, BarChart2,
  Settings, Shield, LogOut
} from 'lucide-react';
import useStore from '../../store/useStore';
import clsx from 'clsx';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard' },
  { icon: Activity,        label: 'Sensors',    path: '/sensors' },
  { icon: AlertTriangle,   label: 'Alerts',     path: '/alerts' },
  { icon: BarChart2,       label: 'Analytics',  path: '/analytics' },
  { icon: Settings,        label: 'Settings',   path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { clearAuth, isConnected, unreadCount } = useStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-40 w-64 flex flex-col py-6"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 mb-8 w-full">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm cursor-pointer">
          <Shield size={20} className="text-indigo-600" strokeWidth={2} />
        </div>
        <span className="font-extrabold text-slate-800 text-lg tracking-tight">SensorGuard</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-2 flex-1 w-full px-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink key={path} to={path} title={label}>
            {({ isActive }) => (
              <motion.div
                className={clsx(
                  'relative flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors font-medium text-sm',
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                )}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>

                {label === 'Alerts' && unreadCount > 0 && (
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: connection status + logout */}
      <div className="flex flex-col gap-4 w-full px-6 mt-4 border-t border-slate-100 pt-6">
        <div title={isConnected ? 'Connected' : 'Disconnected'} className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span className={clsx('block w-2.5 h-2.5 rounded-full', isConnected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]')} />
          <span className="text-xs font-bold text-slate-600">{isConnected ? 'System Live' : 'Offline'}</span>
        </div>

        <motion.button
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Sign out</span>
        </motion.button>
      </div>
    </aside>
  );
}
