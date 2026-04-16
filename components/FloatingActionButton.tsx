'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, UserPlus, Calendar, Scissors, X } from 'lucide-react';
import { View } from '@/lib/supabase-service';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  setView: (v: View) => void;
}

export const FloatingActionButton = ({ setView }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'new-client', label: 'Nova Cliente', icon: UserPlus, color: 'bg-blue-500' },
    { id: 'new-appointment', label: 'Novo Agendamento', icon: Calendar, color: 'bg-emerald-500' },
    { id: 'new-appointment', label: 'Novo Atendimento', icon: Scissors, color: 'bg-purple-500' },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-[60] md:hidden">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col-reverse items-end gap-3 mb-4">
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setView(action.id as View);
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="bg-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold text-on-surface border border-outline-variant/10">
                  {action.label}
                </span>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90",
                  action.color
                )}>
                  <action.icon size={20} />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 active:scale-90",
          isOpen ? "bg-slate-800 rotate-45" : "bg-brand-gradient"
        )}
      >
        {isOpen ? <X size={28} /> : <Plus size={28} />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[-1]"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
