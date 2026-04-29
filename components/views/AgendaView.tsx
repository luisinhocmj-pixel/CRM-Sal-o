'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Calendar, ChevronLeft, ChevronRight, Clock, User, AlertCircle, Loader2, MessageSquare, Star, Edit2 } from 'lucide-react';
import Image from 'next/image';
import { Client, View, Appointment, getAppointments, getReturnForecasts, deleteAppointment } from '@/lib/supabase-service';
import { cn, getAvatarUrl } from '@/lib/utils';
import { BRAZIL_HOLIDAYS_2026 } from '@/lib/constants';
import { format } from 'date-fns';

interface AgendaViewProps {
  setView: (v: View | 'back') => void;
  onSelectClient: (c: Client) => void;
  onEditAppointment?: (a: Appointment) => void;
  clients: Client[];
}

export const AgendaView = ({ setView, onSelectClient, onEditAppointment, clients }: AgendaViewProps) => {
  const [agendaType, setAgendaType] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [returnForecasts, setReturnForecasts] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const getWeekDays = React.useCallback(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day; // Start from Sunday
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const getMonthDays = React.useCallback(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Padding for start of month
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      const d = new Date(year, month, -i);
      days.unshift(d);
    }
    
    // Days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Padding for end of month
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [selectedDate]);

  const fetchAgendaData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate, endDate;
      if (agendaType === 'dia') {
        startDate = endDate = format(selectedDate, 'yyyy-MM-dd');
      } else if (agendaType === 'semana') {
        const weekDays = getWeekDays();
        startDate = format(weekDays[0], 'yyyy-MM-dd');
        endDate = format(weekDays[6], 'yyyy-MM-dd');
      } else {
        const monthDays = getMonthDays();
        startDate = format(monthDays[0], 'yyyy-MM-dd');
        endDate = format(monthDays[monthDays.length - 1], 'yyyy-MM-dd');
      }

      const [{ data: appts }, forecasts] = await Promise.all([
        getAppointments({ startDate, endDate, pageSize: 500 }),
        getReturnForecasts(startDate, endDate)
      ]);
      
      setAppointments(appts);
      setReturnForecasts(forecasts);
    } catch (error) {
      console.error('Error fetching agenda data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agendaType, selectedDate, getWeekDays, getMonthDays]);

  useEffect(() => {
    fetchAgendaData();
  }, [fetchAgendaData]);

  const handleDeleteAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este atendimento?')) return;
    
    setIsDeleting(id);
    const success = await deleteAppointment(id);
    if (success) {
      setAppointments(prev => prev.filter(a => a.id !== id));
    } else {
      alert('Erro ao excluir atendimento.');
    }
    setIsDeleting(null);
  };

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    if (agendaType === 'dia') newDate.setDate(selectedDate.getDate() - 1);
    else if (agendaType === 'semana') newDate.setDate(selectedDate.getDate() - 7);
    else newDate.setMonth(selectedDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    if (agendaType === 'dia') newDate.setDate(selectedDate.getDate() + 1);
    else if (agendaType === 'semana') newDate.setDate(selectedDate.getDate() + 7);
    else newDate.setMonth(selectedDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const getHoliday = (date: Date) => {
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    return BRAZIL_HOLIDAYS_2026[dateStr];
  };

  const renderDayView = () => {
    const holiday = getHoliday(selectedDate);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayForecasts = returnForecasts.filter(f => f.nextVisit === dateStr);

    return (
      <div className="space-y-6">
        {holiday && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">Feriado: {holiday}</span>
          </div>
        )}

        {dayForecasts.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Star size={14} className="fill-primary" />
              Previsão de Retorno (Forecast)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayForecasts.map(forecast => (
                <div 
                  key={forecast.id} 
                  onClick={() => onSelectClient(forecast)}
                  className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/20">
                      <Image 
                        src={forecast.img || getAvatarUrl(forecast.name)} 
                        alt={forecast.name} 
                        fill 
                        sizes="40px" 
                        className="object-cover" 
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{forecast.name}</p>
                      <p className="text-[10px] text-primary font-medium">Previsto: {forecast.service || 'Retorno'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const msg = encodeURIComponent(`Olá ${forecast.name}! Aqui é da Estética & Bem-Estar. Notei que está chegando o tempo do seu retorno para o serviço de ${forecast.service || 'cabelo'}. Podemos agendar um horário?`);
                      window.open(`https://wa.me/${forecast.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                    }}
                    className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition-all shadow-sm"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4 relative before:absolute before:left-[47px] md:before:left-[59px] before:top-0 before:bottom-0 before:w-px before:bg-slate-100 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : appointments.length > 0 ? (
            appointments.map((app, i) => {
              const client = clients.find(c => c.name === app.client_name);
              return (
                <div key={i} className="flex gap-4 md:gap-6 group">
                  <span className="w-8 md:w-10 text-right text-[10px] md:text-xs font-bold mt-3 text-slate-400">
                    {app.time}
                  </span>
                  <div 
                    onClick={() => client && onSelectClient(client)}
                    className="flex-grow p-4 md:p-5 rounded-2xl border-l-4 bg-[#F8F6FB] border-[#6F3BD1] hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-200">
                          <Image 
                            src={client?.img || getAvatarUrl(app.client_name)} 
                            alt={app.client_name} 
                            fill 
                            sizes="32px" 
                            className="object-cover" 
                            referrerPolicy="no-referrer"
                            unoptimized
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm md:text-base">{app.client_name}</h4>
                          <p className="text-[10px] md:text-xs font-medium text-[#6F3BD1]">{app.service}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-400">{app.payment}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAppointment?.(app);
                            }}
                            className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => app.id && handleDeleteAppointment(app.id, e)}
                            disabled={isDeleting === app.id}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            {isDeleting === app.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Calendar size={32} />
              </div>
              <p className="text-slate-400 font-medium">Nenhum agendamento para este dia</p>
              <button 
                onClick={() => setView('new-appointment')}
                className="text-[#6F3BD1] font-bold text-sm hover:underline"
              >
                + Adicionar Agendamento
              </button>
            </div>
          )}
          
          {/* Empty slots visualization */}
          {(appointments.length < 5 && appointments.length > 0) && (
            <div className="flex gap-4 md:gap-6 group opacity-40">
              <span className="w-8 md:w-10 text-right text-[10px] md:text-xs font-bold mt-3 text-slate-400">16:00</span>
              <div 
                onClick={() => setView('new-appointment')}
                className="flex-grow border-2 border-dashed border-slate-100 rounded-2xl p-4 md:p-5 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <span className="text-slate-300 font-bold text-[10px] md:text-sm group-hover:text-[#6F3BD1]">+ Disponível para reserva</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    return (
      <div className="grid grid-cols-7 gap-2 md:gap-4 h-[600px] overflow-y-auto pr-2 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        {weekDays.map((date, i) => {
          const holiday = getHoliday(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayAppts = appointments.filter(a => a.date === dateStr);
          const dayForecasts = returnForecasts.filter(f => f.nextVisit === dateStr);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div key={i} className="flex flex-col gap-2 min-w-[80px]">
              <div className={cn(
                "text-center p-2 rounded-xl transition-colors",
                isToday ? "bg-[#6F3BD1] text-white" : "bg-slate-50"
              )}>
                <p className="text-[9px] font-bold uppercase opacity-70">{daysOfWeek[i]}</p>
                <p className="text-sm font-black">{date.getDate()}</p>
              </div>
              
              <div className="flex-grow bg-white border border-slate-100 rounded-xl p-1 space-y-1 min-h-[400px]">
                {holiday && (
                  <div className="bg-amber-100 p-1 rounded text-[8px] font-bold text-amber-800 leading-tight">
                    {holiday}
                  </div>
                )}
                {dayForecasts.map((forecast, idx) => (
                  <div key={`f-${idx}`} className="bg-primary/10 border-l-2 border-primary p-1.5 rounded text-[9px] leading-tight">
                    <p className="font-bold truncate text-primary">{forecast.name}</p>
                    <p className="text-primary/70 truncate">Previsão Retorno</p>
                  </div>
                ))}
                {dayAppts.map((app, idx) => (
                  <div key={`a-${idx}`} className="bg-[#F8F6FB] border-l-2 border-[#6F3BD1] p-1.5 rounded text-[9px] leading-tight">
                    <p className="font-bold truncate">{app.client_name}</p>
                    <p className="text-slate-500 truncate">{app.time}</p>
                  </div>
                ))}
                {dayAppts.length === 0 && dayForecasts.length === 0 && !holiday && (
                  <div className="h-full flex items-center justify-center opacity-10">
                    <Clock size={16} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays();
    return (
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        {daysOfWeek.map(day => (
          <div key={day} className="bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-400 uppercase">
            {day}
          </div>
        ))}
        {monthDays.map((date, i) => {
          const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const holiday = getHoliday(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayAppts = appointments.filter(a => a.date === dateStr);
          const dayForecasts = returnForecasts.filter(f => f.nextVisit === dateStr);
          
          return (
            <div 
              key={i} 
              onClick={() => setSelectedDate(date)}
              className={cn(
                "bg-white min-h-[80px] md:min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-slate-50",
                !isCurrentMonth && "opacity-30",
                isSelected && "ring-2 ring-inset ring-[#6F3BD1] z-10"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                  isToday ? "bg-[#6F3BD1] text-white" : "text-on-surface"
                )}>
                  {date.getDate()}
                </span>
                {(dayAppts.length > 0 || dayForecasts.length > 0) && (
                  <div className="flex gap-0.5">
                    {dayAppts.length > 0 && <span className="w-1.5 h-1.5 bg-[#6F3BD1] rounded-full"></span>}
                    {dayForecasts.length > 0 && <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>}
                  </div>
                )}
              </div>
              
              <div className="space-y-1 overflow-hidden">
                {holiday && (
                  <p className="text-[8px] font-bold text-amber-600 truncate">{holiday}</p>
                )}
                {dayForecasts.slice(0, 1).map((f, idx) => (
                  <p key={`f-${idx}`} className="text-[9px] text-primary truncate bg-primary/10 px-1 rounded font-bold">
                    PREV: {f.name}
                  </p>
                ))}
                {dayAppts.slice(0, 2).map((app, idx) => (
                  <p key={idx} className="text-[9px] text-slate-500 truncate bg-slate-50 px-1 rounded">
                    {app.client_name}
                  </p>
                ))}
                {(dayAppts.length + dayForecasts.length > 3) && (
                  <p className="text-[8px] text-[#6F3BD1] font-bold">+{dayAppts.length + dayForecasts.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 md:p-8 flex flex-col lg:flex-row gap-8 pb-24 md:pb-8"
    >
      <section className="w-full lg:w-1/4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold font-headline text-on-surface">Próximos Retornos</h2>
          <span className="bg-[#fe9cbb]/20 text-[#944461] px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
            {clients.length} Ativos
          </span>
        </div>
        <div className="space-y-4">
          {clients.slice(0, 4).map((client, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-soft border border-outline-variant/10 hover:bg-surface-bright transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectClient(client)}>
                  <div className="relative w-10 h-10">
                    <Image 
                      src={client.img || getAvatarUrl(client.name)} 
                      alt={client.name} 
                      fill 
                      sizes="40px" 
                      className="rounded-full object-cover" 
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface text-sm">{client.name}</h3>
                    <p className="text-[10px] text-on-surface-variant">{client.service}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#E889A8] font-bold uppercase">Vence em {i + 1}d</span>
                <button 
                  onClick={() => onSelectClient(client)}
                  className="text-[#6F3BD1] p-2 hover:bg-[#6F3BD1]/10 rounded-full transition-colors"
                >
                  <User size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full lg:w-3/4 flex flex-col gap-6">
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-soft min-h-[700px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <button onClick={handlePrevDate} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                <button onClick={handleNextDate} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={24} /></button>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface">
                  {agendaType === 'mes' 
                    ? `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` 
                    : agendaType === 'semana'
                    ? `Semana de ${selectedDate.getDate()} de ${months[selectedDate.getMonth()]}`
                    : `${selectedDate.getDate()} de ${months[selectedDate.getMonth()]}`
                  }
                </h2>
                <p className="text-on-surface-variant text-xs md:text-sm mt-1">
                  {agendaType === 'dia' ? 'Visão diária detalhada' : agendaType === 'semana' ? 'Visão semanal' : 'Visão mensal completa'}
                </p>
              </div>
            </div>
            <div className="flex bg-surface-container-low p-1 rounded-full w-full sm:w-auto">
              <button 
                onClick={() => setAgendaType('dia')}
                className={cn("flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all", agendaType === 'dia' ? "bg-white shadow-sm text-[#6F3BD1]" : "text-slate-500")}
              >Dia</button>
              <button 
                onClick={() => setAgendaType('semana')}
                className={cn("flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all", agendaType === 'semana' ? "bg-white shadow-sm text-[#6F3BD1]" : "text-slate-500")}
              >Semana</button>
              <button 
                onClick={() => setAgendaType('mes')}
                className={cn("flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all", agendaType === 'mes' ? "bg-white shadow-sm text-[#6F3BD1]" : "text-slate-500")}
              >Mês</button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={agendaType + selectedDate.toDateString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {agendaType === 'dia' && renderDayView()}
              {agendaType === 'semana' && renderWeekView()}
              {agendaType === 'mes' && renderMonthView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
};
