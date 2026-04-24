'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Search, Scissors, CheckCircle2, Star, UserPlus, X, Phone
} from 'lucide-react';
import Image from 'next/image';
import { View, Client, saveAppointment, Appointment } from '@/lib/supabase-service';
import { HAIR_SERVICES, PAYMENT_METHODS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface NewAppointmentViewProps {
  setView: (v: View | 'back') => void;
  clients: Client[];
  onSave?: (data: Appointment & { next_visit?: string }) => Promise<void>;
}

export const NewAppointmentView = ({ setView, clients, onSave }: NewAppointmentViewProps) => {
  const [selectedService, setSelectedService] = useState(HAIR_SERVICES[0].name);
  const [customService, setCustomService] = useState('');
  const [serviceValue, setServiceValue] = useState('350,00');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('14:00');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  
  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch)
    ).slice(0, 5);
  }, [clients, clientSearch]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch('');
    setIsSearching(false);
  };

  const handlePresetClick = (days: number) => {
    const baseDate = appointmentDate ? new Date(appointmentDate) : new Date();
    // Use UTC to avoid timezone issues when adding days
    const resultDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setNextVisitDate(resultDate.toISOString().split('T')[0]);
    setActivePreset(days);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-24 md:pb-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-soft border border-white">
            <h3 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Identificação da Cliente
            </h3>
            
            {!selectedClient ? (
              <div className="relative group mb-8">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-2 ml-1">Buscar Cliente</label>
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Nome ou Telefone..." 
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setIsSearching(true);
                    }}
                    onFocus={() => setIsSearching(true)}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline/60"
                  />
                  
                  <AnimatePresence>
                    {isSearching && (clientSearch || filteredClients.length > 0) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50"
                      >
                        <div className="p-2 space-y-1">
                          {filteredClients.map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleSelectClient(client)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low rounded-xl transition-colors text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {client.initial || client.name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-on-surface">{client.name}</p>
                                <p className="text-xs text-outline">{client.phone}</p>
                              </div>
                            </button>
                          ))}
                          
                          <button
                            onClick={() => setView('new-client')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors text-left text-primary border-t border-outline-variant/10 mt-1"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserPlus size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">Cadastrar Nova Cliente</p>
                              <p className="text-xs opacity-70">Adicionar à base de dados</p>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xl">
                    {selectedClient.initial || selectedClient.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{selectedClient.name}</h4>
                    <p className="text-xs text-outline flex items-center gap-1">
                      <Phone size={12} />
                      {selectedClient.phone}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <hr className="border-surface-container-high my-8 opacity-50" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                <Scissors size={20} className="text-primary" />
                Detalhes do Serviço
              </h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Serviço Realizado</label>
                  <select 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-4 bg-white border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface appearance-none shadow-sm"
                  >
                    {HAIR_SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    <option value="Outro">Outro (Digitar...)</option>
                  </select>
                  
                  {selectedService === 'Outro' && (
                    <motion.input
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      type="text"
                      placeholder="Nome do serviço personalizado..."
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      className="w-full mt-2 px-4 py-3 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Valor do Serviço</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">R$</span>
                    <input 
                      type="text" 
                      value={serviceValue}
                      onChange={(e) => setServiceValue(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-bold shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Forma de Pagamento</label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-4 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Data</label>
                <input 
                  type="date" 
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-4 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Horário</label>
                <input 
                  type="time" 
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-4 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface" 
                />
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1 ml-1">Agendar Retorno</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[5, 7, 15, 30, 45].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handlePresetClick(days)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                        activePreset === days 
                          ? "bg-primary text-white border-primary shadow-md" 
                          : "bg-white text-primary border-primary/20 hover:bg-primary/5"
                      )}
                    >
                      +{days} dias
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNextVisitDate('');
                      setActivePreset(null);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-white text-outline border border-outline/20 hover:bg-slate-50 transition-all"
                  >
                    Limpar
                  </button>
                </div>
                <input 
                  type="date" 
                  value={nextVisitDate}
                  onChange={(e) => {
                    setNextVisitDate(e.target.value);
                    setActivePreset(null);
                  }}
                  className="w-full px-4 py-4 bg-primary/5 border border-primary/20 rounded-full focus:ring-2 focus:ring-primary/20 transition-all text-on-surface" 
                />
                <p className="text-[10px] text-outline ml-1 italic">Dica: Escolha um atalho acima ou selecione uma data personalizada.</p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Observações</label>
              <textarea 
                placeholder="Alguma recomendação específica..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-6 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface min-h-[120px]"
              ></textarea>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 mt-8">
            <button onClick={() => setView('dashboard')} className="px-8 py-4 font-bold text-primary hover:bg-primary/5 rounded-full transition-colors">Cancelar</button>
            <button 
              disabled={isSaving || !selectedClient || (selectedService === 'Outro' && customService.trim().length < 2)}
              onClick={async () => {
                if (!selectedClient) return;
                if (!selectedClient?.id) {
                  alert('ID da cliente não encontrado. Selecione a cliente novamente.');
                  return;
                }

                if (selectedService === 'Outro' && customService.trim().length < 2) {
                  alert('Por favor, digite o nome do serviço.');
                  return;
                }
                
                setIsSaving(true);
                try {
                  const val = Number(serviceValue.replace(',', '.'));
                  const apptData = {
                    client_id: selectedClient.id!,
                    client_name: selectedClient.name,
                    service: selectedService === 'Outro' ? customService : selectedService,
                    value: isNaN(val) ? 0 : val,
                    time: appointmentTime,
                    payment: paymentMethod,
                    date: appointmentDate,
                    notes: notes
                  };
                  
                  if (onSave) {
                    await onSave({ ...apptData, next_visit: nextVisitDate || undefined });
                  } else {
                    await saveAppointment(apptData);
                    setView('dashboard');
                  }
                } catch (error: unknown) {
                  console.error('Save error detail:', error);
                  const msg = error instanceof Error ? error.message : String(error);
                  if (msg.includes('column') && msg.includes('client_name')) {
                    alert('🚨 ESTRUTURA FALTANDO: Sua tabela de agendamentos não tem a coluna "client_name". \n\nComo você é a dona do sistema, precisa colar o código SQL que está em "Ajustes > Dados" no seu painel do Supabase UMA VEZ. Depois disso, NUNCA MAIS precisará fazer isso.');
                    setView('settings');
                  } else if (msg.includes('relation') && msg.includes('exists')) {
                    alert('🚨 TABELAS NÃO CRIADAS: A tabela "appointments" não existe no seu Supabase. \n\nClique em "Copiar Script" em Ajustes > Dados e cole no SQL Editor do Supabase.');
                    setView('settings');
                  } else {
                    const errorObj = error as Record<string, unknown>;
                    const detail = typeof errorObj?.details === 'string' ? errorObj.details : (msg || 'Verifique sua conexão ou se a cliente existe no banco.');
                    alert('Erro ao salvar: ' + detail);
                  }
                } finally {
                  setIsSaving(false);
                }
              }}
              className="bg-brand-gradient text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={20} />
              )}
              {isSaving ? 'Salvando...' : 'Salvar Atendimento'}
            </button>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl overflow-hidden shadow-soft border border-white sticky top-24">
            {selectedClient ? (
              <>
                <div className="p-8 text-center bg-surface-container-low/50">
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-md mx-auto relative overflow-hidden mb-4 bg-primary/10 flex items-center justify-center text-primary font-black text-3xl">
                    {selectedClient.img ? (
                      <Image src={selectedClient.img} alt={selectedClient.name} fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedClient.initial || selectedClient.name[0]
                    )}
                  </div>
                  <h4 className="font-headline font-extrabold text-xl text-on-surface">{selectedClient.name}</h4>
                  <p className="text-sm text-outline font-medium">Cliente {selectedClient.status}</p>
                  {selectedClient.status === 'VIP' && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-[#ffd9e2] text-[#7a2f4b] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Star size={14} fill="currentColor" />
                      Cliente VIP
                    </div>
                  )}
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-white/50">
                      <p className="text-[10px] uppercase font-bold text-outline tracking-wider mb-1">Total Gasto</p>
                      <p className="font-headline font-bold text-lg text-primary">{selectedClient.total || 'R$ 0,00'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-white/50">
                      <p className="text-[10px] uppercase font-bold text-outline tracking-wider mb-1">Última Visita</p>
                      <p className="font-headline font-bold text-sm text-primary truncate">{selectedClient.lastVisit || 'Nunca'}</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-primary-container/5 border border-primary/10">
                    <p className="text-[10px] uppercase font-bold text-primary tracking-wider mb-2">Origem</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed italic">{selectedClient.origin || 'Não informada'}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-outline">
                  <Users size={40} />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Nenhuma Cliente</h4>
                  <p className="text-xs text-outline">Busque uma cliente para ver o histórico aqui.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
