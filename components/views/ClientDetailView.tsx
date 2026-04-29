'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, MessageSquare, CreditCard, Send, History as HistoryIcon, 
  Sparkles, Share2, Edit, PlusCircle, Calendar
} from 'lucide-react';
import Image from 'next/image';
import { Client, View, Appointment } from '@/lib/supabase-service';
import { cn, getAvatarUrl, formatDateBR } from '@/lib/utils';

interface ClientDetailViewProps {
  setView: (v: View | 'back') => void;
  client: Client | null;
  clients: Client[];
  appointments: Appointment[];
  onEditClient: (c: Client) => void;
  onSelectClient: (c: Client) => void;
}

export const ClientDetailView = ({ 
  setView, 
  client,
  clients,
  appointments,
  onEditClient,
  onSelectClient
}: ClientDetailViewProps) => {
  const clientAppointments = React.useMemo(() => {
    if (!client) return [];
    return appointments
      .filter(a => a.client_id === client.id)
      .sort((a, b) => {
        // Robust date comparison using string parts to avoid timezone shifts
        const dateA = a.date.split('T')[0];
        const dateB = b.date.split('T')[0];
        return dateB.localeCompare(dateA);
      });
  }, [appointments, client]);

  // Calculate favorite procedure dynamically
  const favoriteProcedure = React.useMemo(() => {
    if (clientAppointments.length === 0) return 'Nenhum';
    
    const counts: Record<string, number> = {};
    clientAppointments.forEach(a => {
      counts[a.service] = (counts[a.service] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    // Check for tie
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
      return 'Múltiplos / Variados';
    }
    
    return sorted[0][0];
  }, [clientAppointments]);

  if (!client) return null;

  const referredClient = typeof client.referredBy === 'number'
    ? clients.find(c => c.id === client.referredBy)
    : clients.find(c => c.name === client.referredBy);

  const referredByName = referredClient ? referredClient.name : client.referredBy;

  // Calculate real indications
  const indications = clients.filter(c => 
    c.referredBy === client.name || 
    (typeof c.referredBy === 'number' && c.referredBy === client.id)
  );

  // Frequency logic (loyalty)
  const visitCount = client.status === 'VIP' ? 4 : (client.status === 'Regular' ? 3 : 1);

  const handleWhatsApp = () => {
    const message = `Olá ${client.name}, tudo bem?`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={() => setView('back')} className="text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-brand-gradient">Ficha da Cliente</h2>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl shadow-soft flex flex-col items-center text-center space-y-4">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-brand-gradient relative">
            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden relative">
              <Image 
                src={client.img || getAvatarUrl(client.name)} 
                alt={client.name} 
                fill 
                sizes="(max-width: 768px) 128px, 160px" 
                className="object-cover" 
                referrerPolicy="no-referrer"
                unoptimized
              />
            </div>
            <span className="absolute bottom-2 right-2 bg-[#fe9cbb] text-[#7a2f4b] text-[10px] font-bold px-3 py-1 rounded-full border-2 border-white shadow-sm uppercase">{client.status}</span>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">{client.name}</h2>
            <p className="text-on-surface-variant text-xs font-medium mt-1">{client.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full pt-4">
            <button 
              onClick={() => setView('new-appointment')}
              className="flex-1 bg-[#6f3bd1] text-white py-3 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Agendar
            </button>
            <button 
              onClick={() => onEditClient(client)}
              className="w-12 h-12 flex items-center justify-center bg-surface-container-low text-on-surface-variant rounded-full hover:bg-slate-100 transition-colors"
              title="Editar Cliente"
            >
              <Edit size={20} />
            </button>
            <button 
              onClick={handleWhatsApp}
              className="w-12 h-12 flex items-center justify-center bg-surface-container-low text-primary rounded-full hover:bg-primary/10 transition-colors"
              title="WhatsApp"
            >
              <MessageSquare size={20} />
            </button>
            <button 
              onClick={() => setView('new-appointment')}
              className="w-full mt-2 bg-brand-gradient text-white py-3 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <PlusCircle size={18} />
              Registrar Novo Serviço
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Investido', value: client.total, icon: CreditCard, color: '#6F3BD1' },
            { label: 'Indicações', value: String(indications.length).padStart(2, '0'), icon: Send, color: '#E889A8' },
            { label: 'Próximo Retorno', value: formatDateBR(client.nextVisit) || 'Não agendado', icon: HistoryIcon, color: '#6d3800' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-soft flex flex-col justify-between">
              <stat.icon size={32} color={stat.color} />
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-headline font-extrabold truncate" style={{ color: stat.color }}>{stat.value}</h3>
              </div>
            </div>
          ))}
          <div className="sm:col-span-2 md:col-span-3 bg-surface-container-low p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm text-[#6F3BD1]">
                <Sparkles size={24} />
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Procedimento Favorito</h4>
                <p className="text-on-surface-variant text-sm">{favoriteProcedure}</p>
              </div>
            </div>
            {client.origin && (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                  <Share2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Origem</h4>
                  <p className="text-on-surface-variant text-sm">
                    {client.origin} {referredByName && (
                      <>
                        (Por: {referredClient ? (
                          <button 
                            onClick={() => onSelectClient(referredClient)}
                            className="text-primary font-bold hover:underline"
                          >
                            {referredByName}
                          </button>
                        ) : (
                          referredByName
                        )})
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-slate-400 block mb-1 uppercase">Frequência</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn("w-2 h-2 rounded-full", i <= visitCount ? "bg-[#6F3BD1]" : "bg-[#6F3BD1]/20")}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Importantes/Notas Section */}
      <section className="bg-white p-8 rounded-3xl shadow-soft space-y-4 border-l-8 border-primary">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            Notas & Observações Importantes
          </h3>
          <button 
            onClick={() => onEditClient(client)}
            className="text-xs font-bold text-primary hover:underline"
          >
            Editar Notas
          </button>
        </div>
        <div className="p-6 bg-surface-container-low rounded-2xl min-h-[100px]">
          {client.notes ? (
            <p className="text-on-surface whitespace-pre-wrap leading-relaxed">{client.notes}</p>
          ) : (
            <p className="text-on-surface-variant italic text-sm">Nenhuma nota registrada para esta cliente. Clique em editar para adicionar informações sobre saúde, preferências ou alergias.</p>
          )}
        </div>
      </section>

      {/* Client History Section */}
      <section className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
        <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <HistoryIcon size={20} className="text-primary" />
          Histórico de Atendimentos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="py-4 text-xs font-bold text-outline uppercase tracking-widest">Data</th>
                <th className="py-4 text-xs font-bold text-outline uppercase tracking-widest">Serviço</th>
                <th className="py-4 text-xs font-bold text-outline uppercase tracking-widest">Valor</th>
                <th className="py-4 text-xs font-bold text-outline uppercase tracking-widest">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {clientAppointments.length > 0 ? clientAppointments.map((apt, i) => (
                <tr key={i} className="hover:bg-surface-bright transition-colors">
                  <td className="py-4 text-sm font-medium text-on-surface">
                    {formatDateBR(apt.date)}
                  </td>
                  <td className="py-4 text-sm text-on-surface-variant">{apt.service}</td>
                  <td className="py-4 text-sm font-bold text-primary">
                    R$ {Number(apt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      {apt.payment}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant text-sm italic">
                    Nenhum atendimento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};
