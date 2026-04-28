'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Calendar, ChevronRight, ChevronLeft, Loader2
} from 'lucide-react';
import Image from 'next/image';
import { Client, View, Appointment, getFinancialSummary, getAppointments } from '@/lib/supabase-service';
import { cn, getAvatarUrl } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

interface FinancialDetailViewProps {
  setView: (v: View | 'back') => void;
  type: string;
  clients: Client[];
  onSelectClient: (c: Client) => void;
  externalState: {
    level: string;
    year: number;
    month: number;
    day: number;
  };
  setExternalState: React.Dispatch<React.SetStateAction<{
    level: string;
    year: number;
    month: number;
    day: number;
  }>>;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface ChartDataItem {
  name?: string;
  date?: number;
  day?: number;
  month?: number;
  year?: number;
  value?: number;
  total?: number;
  label?: string;
}

export const FinancialDetailView = ({ 
  setView, 
  type, 
  clients, 
  onSelectClient, 
  externalState,
  setExternalState
}: FinancialDetailViewProps) => {
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentLevel = externalState.level;
  const selectedYear = externalState.year;
  const selectedMonth = externalState.month;
  const selectedDay = externalState.day;

  const setCurrentLevel = (level: string) => setExternalState(prev => ({ ...prev, level }));
  const setSelectedYear = (year: number) => setExternalState(prev => ({ ...prev, year }));
  const setSelectedMonth = (month: number) => setExternalState(prev => ({ ...prev, month }));
  const setSelectedDay = (day: number) => setExternalState(prev => ({ ...prev, day }));

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const date = new Date(selectedYear, selectedMonth, selectedDay);
        let startDate, endDate;

        if (currentLevel === 'daily') {
          startDate = endDate = format(date, 'yyyy-MM-dd');
          const [summary, appts] = await Promise.all([
            getFinancialSummary(startDate, endDate),
            getAppointments({ date: startDate, pageSize: 100 })
          ]);
          setSummaryTotal(summary.total);
          setAppointments(appts.data);
        } else if (currentLevel === 'weekly') {
          startDate = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          const summary = await getFinancialSummary(startDate, endDate);
          setSummaryTotal(summary.total);
          
          // Fetch day by day for chart
          const days = eachDayOfInterval({ start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) });
          const daySummaries = await Promise.all(days.map(d => getFinancialSummary(format(d, 'yyyy-MM-dd'), format(d, 'yyyy-MM-dd'))));
          const names = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
          setChartData(days.map((d, i) => ({
            name: names[i],
            date: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            value: daySummaries[i].total,
            label: format(d, 'EEEE, dd', { locale: undefined }) // Simplified for now
          })));
        } else if (currentLevel === 'monthly') {
          startDate = format(startOfMonth(date), 'yyyy-MM-dd');
          endDate = format(endOfMonth(date), 'yyyy-MM-dd');
          const summary = await getFinancialSummary(startDate, endDate);
          setSummaryTotal(summary.total);

          // Fetch day by day for grid
          const days = eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
          const daySummaries = await Promise.all(days.map(d => getFinancialSummary(format(d, 'yyyy-MM-dd'), format(d, 'yyyy-MM-dd'))));
          setChartData(days.map((d, i) => ({
            day: d.getDate(),
            total: daySummaries[i].total
          })));
        } else if (currentLevel === 'yearly') {
          startDate = format(startOfYear(date), 'yyyy-MM-dd');
          endDate = format(endOfYear(date), 'yyyy-MM-dd');
          const summary = await getFinancialSummary(startDate, endDate);
          setSummaryTotal(summary.total);

          // Fetch month by month for grid
          const monthsInterval = eachMonthOfInterval({ start: startOfYear(date), end: endOfYear(date) });
          const monthSummaries = await Promise.all(monthsInterval.map(m => getFinancialSummary(format(startOfMonth(m), 'yyyy-MM-dd'), format(endOfMonth(m), 'yyyy-MM-dd'))));
          setChartData(monthsInterval.map((m, i) => ({
            month: i,
            name: months[i],
            total: monthSummaries[i].total
          })));
        }
      } catch (error) {
        console.error('Error fetching financial detail data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentLevel, selectedYear, selectedMonth, selectedDay]);

  const getWeekRange = () => {
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(selectedYear, selectedMonth, diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const startMonth = months[monday.getMonth()];
    const endDay = sunday.getDate();
    const endMonth = months[sunday.getMonth()];
    const year = monday.getFullYear();

    if (monday.getMonth() === sunday.getMonth()) {
      return `${startDay} a ${endDay} de ${startMonth} de ${year}`;
    } else {
      return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${year}`;
    }
  };

  const getTitle = () => {
    switch (currentLevel) {
      case 'daily': return `Relatório Diário - ${selectedDay} de ${months[selectedMonth]} de ${selectedYear}`;
      case 'weekly': return `Relatório Semanal - ${getWeekRange()}`;
      case 'monthly': return `Relatório Mensal - ${months[selectedMonth]} de ${selectedYear}`;
      case 'yearly': return `Relatório Anual - ${selectedYear}`;
      default: return 'Relatório Financeiro';
    }
  };

  const getSummary = () => {
    return `R$ ${summaryTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleBack = () => {
    if (currentLevel === 'daily') {
      setCurrentLevel('monthly');
    } else if (currentLevel === 'monthly' && type === 'yearly') {
      setCurrentLevel('yearly');
    } else {
      setView('back');
    }
  };

  const renderDaily = () => {
    return (
      <div className="space-y-4 relative min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        <h3 className="font-bold text-lg text-on-surface mb-4">Serviços Realizados em {selectedDay}/{selectedMonth + 1}/{selectedYear}</h3>
        {appointments.length > 0 ? appointments.map((apt, i) => {
          const client = clients.find(c => c.id === apt.client_id) || clients.find(c => c.name === apt.client_name);
          return (
            <div 
              key={i} 
              onClick={() => client && onSelectClient(client)}
              className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-outline-variant/5 hover:bg-surface-bright transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12">
                  <Image 
                    src={client?.img || getAvatarUrl(apt.client_name)} 
                    alt={apt.client_name} 
                    fill 
                    className="rounded-full object-cover border-2 border-white shadow-sm" 
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{apt.client_name}</p>
                  <p className="text-xs text-on-surface-variant">{apt.service} • {apt.time}</p>
                </div>
              </div>
              <p className="font-headline font-bold text-primary">R$ {apt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          );
        }) : !isLoading && (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-outline-variant flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center text-outline">
              <Calendar size={32} />
            </div>
            <div>
              <p className="font-bold text-on-surface">Nenhum atendimento</p>
              <p className="text-sm text-on-surface-variant">Não há registros financeiros para este dia.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWeekly = () => {
    return (
      <div className="space-y-6 relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        <div className="h-64 w-full bg-white p-6 rounded-3xl shadow-soft">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip cursor={{ fill: '#f8f6fb' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" fill="#6F3BD1" radius={[10, 10, 10, 10]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {chartData.map((item) => (
            <div 
              key={item.label} 
              onClick={() => {
                if (item.date !== undefined) setSelectedDay(item.date);
                if (item.month !== undefined) setSelectedMonth(item.month);
                if (item.year !== undefined) setSelectedYear(item.year);
                setCurrentLevel('daily');
              }}
              className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border border-outline-variant/5 hover:bg-surface-bright transition-colors cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-bold text-on-surface">{item.label}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Faturamento</span>
              </div>
              <span className="font-headline font-bold text-[#6F3BD1]">R$ {(item.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handlePrevious = () => {
    if (currentLevel === 'daily') {
      const date = new Date(selectedYear, selectedMonth, selectedDay - 1);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    } else if (currentLevel === 'weekly') {
      const date = new Date(selectedYear, selectedMonth, selectedDay - 7);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    } else if (currentLevel === 'monthly') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else if (currentLevel === 'yearly') {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNext = () => {
    if (currentLevel === 'daily') {
      const date = new Date(selectedYear, selectedMonth, selectedDay + 1);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    } else if (currentLevel === 'weekly') {
      const date = new Date(selectedYear, selectedMonth, selectedDay + 7);
      setSelectedDay(date.getDate());
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    } else if (currentLevel === 'monthly') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else if (currentLevel === 'yearly') {
      setSelectedYear(selectedYear + 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 pb-24 md:pb-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <ArrowLeft size={24} className="text-on-surface-variant" />
          </button>
          <h2 className="text-2xl md:text-3xl font-headline font-black text-on-surface">{getTitle()}</h2>
        </div>
      </div>

      <div className="bg-brand-gradient p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-white/70 text-sm font-bold uppercase tracking-widest mb-1">Total do Período</p>
          <h3 className="text-4xl md:text-5xl font-headline font-black">{getSummary()}</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrevious}
            className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors active:scale-90"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {currentLevel === 'daily' && renderDaily()}
      {currentLevel === 'weekly' && renderWeekly()}
      {currentLevel === 'monthly' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
          {chartData.map(item => {
            return (
              <div 
                key={item.day}
                onClick={() => {
                  if (item.day !== undefined) {
                    setSelectedDay(item.day);
                    setCurrentLevel('daily');
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer text-center",
                  (item.total ?? 0) > 0 ? "bg-primary/5 border-primary/20" : "bg-white border-outline-variant/10"
                )}
              >
                <span className="text-[10px] font-bold text-slate-400 block mb-1">{item.day}</span>
                <span className={cn("font-bold text-sm", (item.total ?? 0) > 0 ? "text-primary" : "text-on-surface-variant")}>
                  R$ {(item.total ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {currentLevel === 'yearly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
          {chartData.map((item) => {
            return (
              <div 
                key={item.name}
                onClick={() => {
                  if (item.month !== undefined) {
                    setSelectedMonth(item.month);
                    setCurrentLevel('monthly');
                  }
                }}
                className={cn(
                  "p-6 rounded-3xl border transition-all cursor-pointer flex justify-between items-center group",
                  (item.total ?? 0) > 0 ? "bg-white border-primary/20 shadow-sm" : "bg-white border-outline-variant/10"
                )}
              >
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">{item.name}</span>
                  <span className={cn("text-xl font-headline font-black", (item.total ?? 0) > 0 ? "text-on-surface" : "text-on-surface/40")}>
                    R$ {(item.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  (item.total ?? 0) > 0 ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white" : "bg-slate-50 text-slate-300"
                )}>
                  <ChevronRight size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
