'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Settings, MoreVertical, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Client, View, getClients } from '@/lib/supabase-service';
import { cn } from '@/lib/utils';

interface ClientsViewProps {
  setView: (v: View | 'back') => void;
  onDelete: (id: number) => void;
  onEdit: (client: Client) => void;
  onSelectClient: (client: Client) => void;
  searchQuery: string;
}

export const ClientsView = ({ 
  setView, 
  onDelete, 
  onEdit, 
  onSelectClient,
  searchQuery 
}: ClientsViewProps) => {
  const [activeFilter, setActiveFilter] = useState('Todas Clientes');
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const { data, count } = await getClients(currentPage, pageSize, searchQuery);
        setClients(data);
        setTotalCount(count);
      } catch (error) {
        console.error('Error fetching clients:', error);
        alert('Erro ao carregar clientes. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [currentPage, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredClients = clients.filter(client => {
    if (activeFilter === 'Todas Clientes') return true;
    if (activeFilter === 'VIPs') return client.status === 'VIP';
    if (activeFilter === 'Novos (30 dias)') return client.status === 'Novo';
    if (activeFilter === 'Inativos') return client.status === 'Inativo';
    return true;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-surface">Gestão de Clientes</h2>
          <p className="text-on-surface-variant font-medium text-sm md:text-base">
            {isLoading ? 'Carregando clientes...' : `Você possui ${totalCount} clientes cadastradas no total.`}
          </p>
        </div>
        <button 
          onClick={() => setView('new-client')}
          className="w-full sm:w-auto bg-brand-gradient text-white px-8 py-4 rounded-full font-headline font-bold flex items-center justify-center gap-2 shadow-soft hover:scale-[1.02] transition-transform"
        >
          <PlusCircle size={20} />
          Nova Cliente
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {['Todas Clientes', 'VIPs', 'Novos (30 dias)', 'Inativos'].map((filter) => (
          <button 
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              activeFilter === filter ? "bg-[#6F3BD1] text-white shadow-md" : "bg-white text-on-surface-variant hover:bg-surface-bright"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl p-2 shadow-soft overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-on-surface-variant text-xs font-bold uppercase tracking-widest bg-surface-container-low">
              <th className="px-6 py-5 rounded-tl-2xl">Cliente</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Última Visita</th>
              <th className="px-6 py-5">Total Investido</th>
              <th className="px-6 py-5 rounded-tr-2xl text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {filteredClients.length > 0 ? filteredClients.map((client) => (
              <tr 
                key={client.id} 
                className="hover:bg-surface-bright transition-colors group"
              >
                <td className="px-6 py-5 cursor-pointer" onClick={() => onSelectClient(client)}>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image src={client.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}&gender=female`} alt={client.name} fill className="rounded-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{client.name}</span>
                      <span className="text-xs text-on-surface-variant">{client.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full",
                    client.status === 'VIP' ? "bg-[#ffd9e2] text-[#7a2f4b]" : 
                    client.status === 'Novo' ? "bg-[#ffdcc3] text-[#2f1500]" : 
                    client.status === 'Inativo' ? "bg-slate-100 text-slate-500" : "bg-surface-container-high text-on-surface-variant"
                  )}>
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface">{client.lastVisit}</span>
                    <span className="text-xs text-slate-400">{client.service}</span>
                  </div>
                </td>
                <td className="px-6 py-5 font-headline font-bold text-[#6F3BD1]">{client.total}</td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onEdit(client)}
                      className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => client.id && onDelete(client.id)}
                      className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-on-surface-variant italic">
                  Nenhuma cliente encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button 
            disabled={currentPage === 1 || isLoading}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 rounded-full bg-white shadow-sm border border-outline-variant/10 disabled:opacity-30 hover:bg-surface-bright transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-on-surface">
            Página {currentPage} de {totalPages}
          </span>
          <button 
            disabled={currentPage === totalPages || isLoading}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 rounded-full bg-white shadow-sm border border-outline-variant/10 disabled:opacity-30 hover:bg-surface-bright transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white p-5 rounded-2xl shadow-soft border border-outline-variant/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3" onClick={() => onSelectClient(client)}>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image src={client.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}&gender=female`} alt={client.name} fill className="rounded-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface text-sm">{client.name}</span>
                  <span className="text-[10px] text-on-surface-variant truncate max-w-[150px]">{client.phone}</span>
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-full",
                client.status === 'VIP' ? "bg-[#ffd9e2] text-[#7a2f4b]" : 
                client.status === 'Novo' ? "bg-[#ffdcc3] text-[#2f1500]" : "bg-slate-100 text-slate-500"
              )}>
                {client.status}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Investimento</span>
                <span className="font-bold text-[#6F3BD1]">{client.total}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(client)} className="p-2 bg-surface-container-low rounded-full text-primary">
                  <Settings size={16} />
                </button>
                <button onClick={() => client.id && onDelete(client.id)} className="p-2 bg-surface-container-low rounded-full text-red-500">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
