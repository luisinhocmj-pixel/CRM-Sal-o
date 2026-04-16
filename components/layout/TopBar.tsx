'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Bell, PlusCircle, LayoutDashboard, Users, Calendar, Settings, X, Phone, CreditCard, LogOut
} from 'lucide-react';
import { View, Client } from '@/lib/supabase-service';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TopBarProps {
  view: View;
  setView: (v: View) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onFinancialClick?: () => void;
}

export const TopBar = ({ 
  view, 
  setView, 
  searchQuery, 
  setSearchQuery, 
  clients, 
  onSelectClient,
  onFinancialClick
}: TopBarProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return [];
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    ).slice(0, 5);
  }, [clients, searchQuery]);

  const getTitle = () => {
    switch (view) {
      case 'dashboard': return 'Dashboard';
      case 'clients': return 'Clientes';
      case 'agenda': return 'Agenda';
      case 'returns': return 'Retornos';
      case 'settings': return 'Configurações';
      case 'notifications': return 'Notificações';
      case 'new-appointment': return 'Novo Atendimento';
      case 'new-client': return 'Nova Cliente';
      case 'client-detail': return 'Detalhes da Cliente';
      default: return 'LuxeBeauty';
    }
  };

  const handleSelectResult = (client: Client) => {
    onSelectClient(client);
    setSearchQuery('');
    setShowResults(false);
    setIsSearchOpen(false);
  };

  const mobileNav = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'clients', icon: Users },
    { id: 'agenda', icon: Calendar },
    { id: 'financial-detail', icon: CreditCard },
    { id: 'settings', icon: Settings },
    { id: 'logout', icon: LogOut },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-headline font-black text-xl md:text-2xl text-on-surface truncate max-w-[150px] md:max-w-none">
            {getTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div ref={searchRef} className="relative">
            <div className={cn(
              "flex items-center bg-surface-container-low rounded-full px-4 py-2 transition-all duration-300",
              isSearchOpen ? "w-48 md:w-80 ring-2 ring-primary/20" : "w-10 md:w-64"
            )}>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-on-surface-variant hover:text-primary transition-colors relative z-10"
              >
                <Search size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setShowResults(true);
                }}
                className={cn(
                  "bg-transparent border-none focus:ring-0 text-sm ml-2 w-full transition-opacity duration-300",
                  isSearchOpen ? "opacity-100" : "opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
                )}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-outline hover:text-on-surface transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showResults && searchQuery && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50"
                >
                  <div className="p-2 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest px-3 py-2 sticky top-0 bg-white z-10">Clientes Encontradas</p>
                    {filteredClients.length > 0 ? (
                      <div className="space-y-1">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectResult(client)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low rounded-xl transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {client.initial || client.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-on-surface">{client.name}</p>
                              <p className="text-xs text-outline flex items-center gap-1">
                                <Phone size={10} />
                                {client.phone}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-outline">Nenhuma cliente encontrada.</p>
                        <button 
                          onClick={() => {
                            setView('new-client');
                            setShowResults(false);
                            setIsSearchOpen(false);
                          }}
                          className="mt-2 text-xs font-bold text-primary hover:underline"
                        >
                          Cadastrar nova cliente
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => setView('notifications')}
            className="p-2 md:p-3 bg-surface-container-low text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all relative"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <button 
            onClick={() => setView('new-appointment')}
            className="hidden md:flex items-center gap-2 bg-brand-gradient text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <PlusCircle size={18} />
            Novo Atendimento
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-outline-variant/10 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {mobileNav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'logout') {
                supabase?.auth.signOut();
              } else if (item.id === 'financial-detail' && onFinancialClick) {
                onFinancialClick();
              } else {
                setView(item.id as View);
              }
            }}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              view === item.id ? "bg-primary text-white shadow-lg -translate-y-2" : "text-slate-400"
            )}
          >
            <item.icon size={24} />
          </button>
        ))}
      </nav>
    </>
  );
};
