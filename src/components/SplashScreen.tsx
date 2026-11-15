import { motion } from 'motion/react';
import { BrandLogo } from './BrandLogo';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <BrandLogo size={56} />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          KinLedger
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Family Finance ERP
        </p>
        <div className="mt-8 w-44 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="h-full w-1/2 rounded-full bg-emerald-700 dark:bg-emerald-500"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Synchronizing household ledger
        </p>
      </motion.div>
    </div>
  );
}
