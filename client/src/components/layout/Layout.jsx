import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Sidebar />
      <Header />

      <main className="min-h-screen ml-64 pt-32 p-8 relative z-10 pb-10 bg-transparent">
        <motion.div
          className="page-enter max-w-[1400px] mx-auto w-full text-slate-800"
          key="layout-content"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
