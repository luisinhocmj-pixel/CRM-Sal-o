'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, CalendarDays, AlertCircle, Clock, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Client, View } from '@/lib/supabase-service';
import { cn, getAvatarUrl } from '@/lib/utils';
import { getClientStatusMetrics, generateWhatsAppMessage } from '@/lib/automation-utils';
import { differenceInDays, parse } from 'date-fns';

interface ReturnsViewProps {
  setView: (v: View | 'back') => void;
  onSelectClient: (c: Client) => void;
  clients: Client[];
}

export const ReturnsView = ({ setView, onSelectClient, clients }: ReturnsViewProps) => {
  const [activeTab, setActiveTab] = useState('Próximos');
  const { overdue, inactive, upcoming } = getClientStatusMetrics(clients);
  
  const getFilteredReturns = () => {
    if (activeTab === 'Atrasados') return overdue;
    if (activeTab === 'Próximos') return upcoming;
    if (activeTab === 'Inativos') return inactive;
    return [...upcoming, ...overdue, ...inactive];
  };

  const returns = getFilteredReturns();

  const handleWhatsApp = (client: Client) => {
    const type = activeTab === 'Atrasados' ? 'overdue' : 
                 activeTab === 'Inativos' ? 'inactive' : 'reminder';
    const url = generateWhatsAppMessage(client, type);
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-surface">Gestão de Retornos</h2>
          <p className="text-on-surface-variant font-medium text-sm md:text-base">Acompanhe clientes que precisam retornar para manter seus resultados.</p>
        </div>
        <div className="flex bg-white p-1 rounded-full shadow-sm border border-outline-variant/10 w-full sm:w-auto overflow-x-auto scrollbar-hide">
          {['Próximos', 'Atrasados', 'Inativos', 'Todos'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                activeTab === tab ? "bg-[#6F3BD1] text-white" : "text-slate-500"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {returns.map((ret) => (
          <div key={ret.id} className="bg-white p-5 md:p-6 rounded-3xl shadow-soft border border-outline-variant/5 hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => onSelectClient(ret)}>
                <div className="relative w-14 h-14 md:w-16 md:h-16">
                  <Image 
                    src={ret.img || getAvatarUrl(ret.name)} 
                    alt={ret.name} 
                    fill 
                    className="rounded-2xl object-cover shadow-md" 
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                </div>
                <div>
                  <h4 className="font-bold text-base md:text-lg text-on-surface">{ret.name}</h4>
                  <p className="text-[10px] md:text-xs text-on-surface-variant font-medium">{ret.service}</p>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                overdue.some(c => c.id === ret.id) ? "bg-red-100 text-red-600" : 
                inactive.some(c => c.id === ret.id) ? "bg-amber-100 text-amber-600 border border-amber-200 shadow-sm" :
                "bg-blue-100 text-blue-600"
              )}>
                {overdue.some(c => c.id === ret.id) ? <AlertCircle size={12} /> : 
                 inactive.some(c => c.id === ret.id) ? <Sparkles size={12} /> : 
                 <Clock size={12} />}
                {overdue.some(c => c.id === ret.id) ? 'Atrasado' : 
                 inactive.some(c => c.id === ret.id) ? 'Prioridade de Retorno' : 'Próximo'}
              </div>
            </div>

            {inactive.some(c => c.id === ret.id) && (
              <div className="mb-4 p-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-700">
                  ⚠️ Ausente há {ret.lastVisit ? differenceInDays(new Date(), parse(ret.lastVisit, 'yyyy-MM-dd', new Date())) : '?'} dias
                </span>
                <span className="text-[10px] text-amber-600">— Ideal recuperar!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
              <div className="bg-surface-container-low p-3 md:p-4 rounded-2xl">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-outline tracking-widest mb-1">Última Visita</p>
                <p className="text-xs md:text-sm font-bold text-on-surface">{ret.lastVisit}</p>
              </div>
              <div className="bg-surface-container-low p-3 md:p-4 rounded-2xl">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-outline tracking-widest mb-1">Sugestão Retorno</p>
                <p className="text-xs md:text-sm font-bold text-primary">{ret.nextVisit}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => handleWhatsApp(ret)}
                className="w-full sm:flex-grow bg-brand-gradient text-white py-3 md:py-4 rounded-2xl font-bold text-xs md:text-sm shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Lembrete WhatsApp
              </button>
              <button 
                onClick={() => setView('agenda')}
                className="w-full sm:w-14 h-12 md:h-14 flex items-center justify-center bg-surface-container-low text-primary rounded-2xl hover:bg-primary/10 transition-colors"
              >
                <CalendarDays size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
