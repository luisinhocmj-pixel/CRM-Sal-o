'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, TrendingUp, 
  History as HistoryIcon, Star, CalendarDays,
  Loader2, Users, PieChart, Award, AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { Client, View, getFinancialSummary } from '@/lib/supabase-service';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { getTopSpenders, getTopReferrers, getOriginStats, getClientStatusMetrics } from '@/lib/automation-utils';

interface DashboardViewProps {
  setView: (v: View) => void;
  clients: Client[];
  setFinancialType: (t: string) => void;
  userName?: string;
  healthStatus?: { ok: boolean; details?: Record<string, boolean> } | null;
}

export const DashboardView = ({ setView, clients, setFinancialType, userName, healthStatus }: DashboardViewProps) => {
  const [financials, setFinancials] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0
  });
  const [loadingFinancials, setLoadingFinancials] = useState(true);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => format(now, 'yyyy-MM-dd'), [now]);
  const currentDate = useMemo(() => now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), [now]);
  
  useEffect(() => {
    const fetchFinancials = async () => {
      setLoadingFinancials(true);
      try {
        const todayStr = today;
        
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        
        const yearStart = format(startOfYear(now), 'yyyy-MM-dd');
        const yearEnd = format(endOfYear(now), 'yyyy-MM-dd');

        const [daily, weekly, monthly, yearly] = await Promise.all([
          getFinancialSummary(todayStr, todayStr),
          getFinancialSummary(weekStart, weekEnd),
          getFinancialSummary(monthStart, monthEnd),
          getFinancialSummary(yearStart, yearEnd)
        ]);

        setFinancials({
          daily: daily.total,
          weekly: weekly.total,
          monthly: monthly.total,
          yearly: yearly.total
        });
      } catch (error) {
        console.error('Error fetching dashboard financials:', error);
      } finally {
        setLoadingFinancials(false);
      }
    };

    fetchFinancials();
  }, [today, now]);

  const financialCards = [
    { id: 'daily', label: 'Ganho Diário', value: financials.daily, change: financials.daily > 0 ? '+100%' : '0%', icon: CreditCard, color: 'primary', sub: 'Hoje' },
    { id: 'weekly', label: 'Ganho Semanal', value: financials.weekly, change: '+15%', icon: TrendingUp, color: 'secondary', sub: 'Esta semana' },
    { id: 'monthly', label: 'Ganho Mensal', value: financials.monthly, change: '+5%', icon: HistoryIcon, color: 'tertiary', sub: 'Este mês' },
    { id: 'yearly', label: 'Ganho Anual', value: financials.yearly, change: `Meta ${now.getFullYear()}`, icon: Star, color: 'gradient', sub: `Ano ${now.getFullYear()}` },
  ];

  const topSpenders = useMemo(() => getTopSpenders(clients, 3), [clients]);
  const topReferrers = useMemo(() => getTopReferrers(clients, 3), [clients]);
  const originStats = useMemo(() => getOriginStats(clients), [clients]);
  const { overdue, inactive } = useMemo(() => getClientStatusMetrics(clients), [clients]);

  // Dynamic upcoming returns based on nextVisit field
  const upcomingReturns = clients
    .filter(c => c.nextVisit)
    .sort((a, b) => {
      const dateA = new Date(a.nextVisit!.split('-').join('/'));
      const dateB = new Date(b.nextVisit!.split('-').join('/'));
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 md:pb-8"
    >
      {healthStatus && !healthStatus.ok && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle size={24} />
            <div>
              <p className="font-bold text-sm">Banco de dados desconfigurado</p>
              <p className="text-xs">Algumas funcionalidades podem não funcionar corretamente.</p>
            </div>
          </div>
          <button 
            onClick={() => setView('settings')}
            className="px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Configurar Agora
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Bom dia, <span className="text-brand-gradient">{userName || 'Especialista'}</span>.
          </h2>
          <p className="text-on-surface-variant font-medium mt-1 text-sm md:text-base">Aqui está o resumo do seu negócio hoje.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-outline-variant/10 w-fit">
          <CalendarDays size={16} className="text-[#6F3BD1]" />
          <span className="text-xs md:text-sm font-semibold">{currentDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialCards.map((card) => (
          <div 
            key={card.id}
            onClick={() => {
              setFinancialType(card.id);
              setView('financial-detail');
            }}
            className={cn(
              "p-6 rounded-2xl shadow-soft flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 cursor-pointer min-h-[160px]",
              card.color === 'gradient' ? "bg-brand-gradient text-white" : "bg-white"
            )}
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-full", card.color === 'gradient' ? "bg-white/20" : "bg-primary/10 text-primary")}>
                <card.icon size={20} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full",
                card.color === 'gradient' ? "bg-white/30" : "bg-emerald-50 text-emerald-600"
              )}>
                {card.change}
              </span>
            </div>
            <div className="mt-4">
              <p className={cn("text-xs font-semibold uppercase tracking-wider", card.color === 'gradient' ? "text-white/80" : "text-on-surface-variant")}>
                {card.label}
              </p>
              {loadingFinancials ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 size={16} className="animate-spin opacity-50" />
                  <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : (
                <h3 className="font-headline text-2xl font-bold mt-1">
                  R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] opacity-60 font-medium">{card.sub}</p>
                {card.id === 'daily' && !loadingFinancials && financials.daily === 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setView('new-appointment');
                    }}
                    className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-all"
                  >
                    Registrar Ganho
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Strategic Insights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/5 flex items-center gap-4 min-w-0 overflow-hidden h-[88px]">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Award size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-outline tracking-widest truncate mb-0.5">Referenciador Top</p>
                <p className="font-bold text-on-surface truncate pr-2 text-sm sm:text-base">
                  {topReferrers[0]?.name || 'Ninguém ainda'}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/5 flex items-center gap-4 min-w-0">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-outline tracking-widest truncate">Retornos Atrasados</p>
                <p className="font-bold text-on-surface truncate">{overdue.length} Clientes</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/5 flex items-center gap-4 min-w-0">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <Users size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-outline tracking-widest truncate">Clientes Inativas</p>
                <p className="font-bold text-on-surface truncate">{inactive.length} Clientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-soft">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Retornos Próximos</h3>
                <p className="text-on-surface-variant text-sm">Fidelização e acompanhamento de clientes</p>
              </div>
              <button onClick={() => setView('agenda')} className="text-[#6F3BD1] font-semibold text-sm hover:underline">Ver Agenda Completa</button>
            </div>
            <div className="space-y-4">
              {upcomingReturns.length > 0 ? upcomingReturns.map((client, i) => (
                <div 
                  key={i} 
                  onClick={() => setView('agenda')}
                  className="flex items-center justify-between p-4 bg-surface-container-low hover:bg-white transition-colors rounded-xl group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                      <Image src={client.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}&gender=female`} alt={client.name} fill sizes="48px" className="rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface">{client.name}</h4>
                      <p className="text-xs text-on-surface-variant">{client.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#6F3BD1]">{client.nextVisit}</p>
                    <p className="text-xs text-on-surface-variant">Retorno</p>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant/20">
                  <p className="text-sm text-on-surface-variant italic">Nenhum retorno agendado para os próximos dias.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-soft">
            <div className="flex items-center gap-2 mb-6">
              <Star size={20} className="text-amber-500" />
              <h3 className="font-bold text-on-surface">Top Clientes</h3>
            </div>
            <div className="space-y-4">
              {topSpenders.map((client, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary">
                    {i + 1}º
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-on-surface">{client.name}</p>
                    <p className="text-[10px] text-on-surface-variant">{client.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-soft">
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={20} className="text-primary" />
              <h3 className="font-bold text-on-surface">Origem das Clientes</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(originStats).sort((a, b) => b[1] - a[1]).map(([origin, count], i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-on-surface-variant">{origin}</span>
                    <span className="text-on-surface font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${(count / clients.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
