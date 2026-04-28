'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Client, View } from '@/lib/supabase-service';
import { CLIENT_STATUS_OPTIONS, CLIENT_ORIGIN_OPTIONS } from '@/lib/constants';

interface NewClientViewProps {
  setView: (v: View | 'back') => void;
  onSave: (client: Partial<Client>) => Promise<void>;
  editingClient: Client | null;
  clients: Client[];
}

export const NewClientView = ({ 
  setView, 
  onSave, 
  editingClient,
  clients
}: NewClientViewProps) => {
  const [formData, setFormData] = useState<Partial<Client>>(
    editingClient || {
      name: '',
      phone: '',
      status: 'Novo',
      total: 'R$ 0,00',
      lastVisit: 'Nunca',
      service: 'Nenhum',
      origin: 'Instagram',
      referredBy: ''
    }
  );

  const [referralSearch, setReferralSearch] = useState('');
  const [showReferralResults, setShowReferralResults] = useState(false);

  const referralResults = clients.filter(c => 
    c.name.toLowerCase().includes(referralSearch.toLowerCase())
  ).slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      setView('clients');
    } catch (error) {
      console.error('Error saving client:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar cliente');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={() => setView('clients')} className="text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-brand-gradient">
          {editingClient ? 'Editar Cliente' : 'Nova Cliente'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-10 shadow-soft border border-white space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Maria Silva" 
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Telefone / WhatsApp</label>
            <input 
              type="tel" 
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(11) 99999-9999" 
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value as Client['status']})}
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface appearance-none"
            >
              {CLIENT_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Origem</label>
            <select 
              value={formData.origin}
              onChange={(e) => setFormData({...formData, origin: e.target.value as Client['origin'], referredBy: ''})}
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface appearance-none"
            >
              {CLIENT_ORIGIN_OPTIONS.map(origin => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>
          </div>

          {formData.origin === 'Indicação' && (
            <div className="space-y-2 relative">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Quem indicou?</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={referralSearch || (typeof formData.referredBy === 'string' ? formData.referredBy : clients.find(c => c.id === formData.referredBy)?.name || '')}
                  onChange={(e) => {
                    setReferralSearch(e.target.value);
                    setFormData({...formData, referredBy: e.target.value});
                    setShowReferralResults(true);
                  }}
                  onFocus={() => setShowReferralResults(true)}
                  placeholder="Busque uma cliente ou digite o nome" 
                  className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                />
                <AnimatePresence>
                  {showReferralResults && referralSearch && referralResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden"
                    >
                      {referralResults.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, referredBy: client.id});
                            setReferralSearch(client.name);
                            setShowReferralResults(false);
                          }}
                          className="w-full px-6 py-3 text-left hover:bg-surface-container-low transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {client.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{client.name}</p>
                            <p className="text-[10px] text-on-surface-variant">Cliente Cadastrada</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1 ml-1">Notas Importantes (Histórico de Saúde, Alergias, etc.)</label>
            <textarea 
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Ex: Alérgica a esmalte X, gosta de café sem açúcar, teve pneumonia recente..." 
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface h-32 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
          <button 
            type="button"
            onClick={() => setView('clients')} 
            className="px-8 py-4 font-bold text-primary hover:bg-primary/5 rounded-full transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="bg-brand-gradient text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={20} />
            {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};
