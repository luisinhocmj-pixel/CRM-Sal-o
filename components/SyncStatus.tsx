'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncStatusProps {
  status: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  onClose: () => void;
}

export const SyncStatus = ({ status, message, onClose }: SyncStatusProps) => {
  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4"
        >
          <div className="flex justify-center">
            {status === 'syncing' && <Loader2 size={48} className="text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 size={48} className="text-emerald-500" />}
            {status === 'error' && <XCircle size={48} className="text-rose-500" />}
          </div>
          
          <h3 className="text-xl font-bold text-on-surface">
            {status === 'syncing' ? 'Sincronizando...' : status === 'success' ? 'Sucesso!' : 'Erro'}
          </h3>
          
          <p className="text-on-surface-variant text-sm">
            {message || (status === 'syncing' ? 'Estamos enviando seus dados para o Supabase.' : status === 'success' ? 'Seus dados foram sincronizados com sucesso.' : 'Ocorreu um erro ao sincronizar os dados.')}
          </p>

          {status !== 'syncing' && (
            <button 
              onClick={onClose}
              className="w-full py-3 bg-surface-container-high rounded-xl font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
            >
              Fechar
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
