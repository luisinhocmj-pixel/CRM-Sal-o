'use client';

import React from 'react';
import { 
  LayoutDashboard, Users, Calendar, RefreshCw, Settings, Sparkles, CreditCard, LogOut 
} from 'lucide-react';
import { View } from '@/lib/supabase-service';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  onFinancialClick?: () => void;
}

export const Sidebar = ({ view, setView, onFinancialClick }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'returns', label: 'Retornos', icon: RefreshCw },
    { id: 'financial-detail', label: 'Financeiro', icon: CreditCard },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-outline-variant/10 h-screen sticky top-0">
      <div className="p-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Sparkles size={24} fill="currentColor" />
        </div>
        <div>
          <h1 className="font-headline font-black text-xl tracking-tight text-on-surface">LuxeBeauty</h1>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">CRM Premium</p>
        </div>
      </div>

      <nav className="flex-grow px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'financial-detail' && onFinancialClick) {
                onFinancialClick();
              } else {
                setView(item.id as View);
              }
            }}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300",
              view === item.id 
                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                : "text-slate-500 hover:bg-surface-bright hover:text-primary"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 space-y-4">
        <button 
          onClick={() => supabase?.auth.signOut()}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm text-error hover:bg-error/5 transition-all"
        >
          <LogOut size={20} />
          Sair do Sistema
        </button>

        <div className="bg-surface-container-low rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-xs font-bold text-on-surface mb-1">Plano Profissional</p>
          <p className="text-[10px] text-on-surface-variant mb-4">Acesso total liberado</p>
          <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-brand-gradient"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
