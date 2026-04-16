'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import { Client, View } from '@/lib/supabase-service';
import { cn } from '@/lib/utils';
import { getClientStatusMetrics } from '@/lib/automation-utils';

interface NotificationsViewProps {
  setView: (v: View | 'back') => void;
  onSelectClient: (c: Client) => void;
  clients: Client[];
}

export const NotificationsView = ({ setView, onSelectClient, clients }: NotificationsViewProps) => {
  const { overdue, inactive, upcoming } = getClientStatusMetrics(clients);

  const notifications = [
    ...overdue.map(c => ({
      id: `overdue-${c.id}`,
      title: 'Retorno Atrasado',
      desc: `${c.name} deveria ter voltado em ${c.nextVisit}. Que tal enviar um lembrete?`,
      time: 'Atrasado',
      icon: AlertCircle,
      color: 'bg-red-50 text-red-500',
      target: 'returns',
      client: c
    })),
    ...upcoming.map(c => ({
      id: `upcoming-${c.id}`,
      title: 'Retorno Próximo',
      desc: `${c.name} tem um retorno previsto para ${c.nextVisit}.`,
      time: 'Em breve',
      icon: Clock,
      color: 'bg-blue-50 text-blue-500',
      target: 'returns',
      client: c
    })),
    ...inactive.map(c => ({
      id: `inactive-${c.id}`,
      title: 'Cliente Inativa',
      desc: `${c.name} não visita o salão há mais de 60 dias.`,
      time: 'Inativa',
      icon: MessageSquare,
      color: 'bg-amber-50 text-amber-500',
      target: 'returns',
      client: c
    }))
  ].slice(0, 10); // Limit to top 10

  const handleNotifClick = (notif: { target: string; client?: Client }) => {
    if (notif.client) {
      onSelectClient(notif.client);
    } else {
      setView(notif.target as View);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 pb-24 md:pb-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
          <ArrowLeft size={24} className="text-on-surface-variant" />
        </button>
        <h2 className="text-2xl md:text-3xl font-headline font-black text-on-surface">Notificações</h2>
      </div>

      <div className="max-w-2xl space-y-4">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            onClick={() => handleNotifClick(notif)}
            className="bg-white p-5 rounded-2xl shadow-soft flex gap-4 border border-outline-variant/5 hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", notif.color)}>
              <notif.icon size={24} />
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{notif.title}</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{notif.time}</span>
              </div>
              <p className="text-sm text-on-surface-variant mt-1">{notif.desc}</p>
              <p className="text-[10px] text-primary font-bold mt-2 uppercase tracking-widest">Clique para ver detalhes</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
