'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, RefreshCw, Scissors, Clock, MessageSquare, 
  ArrowLeft, Download, Bell, Star, Edit, Plus, Sparkles,
  Calendar as CalendarIcon
} from 'lucide-react';
import Image from 'next/image';
import { View } from '@/lib/supabase-service';
import { cn } from '@/lib/utils';
import * as supabaseService from '@/lib/supabase-service';
import { HAIR_SERVICES } from '@/lib/constants';
import { INITIAL_CLIENTS, SPREADSHEET_DATA } from '@/lib/seed-data';
import { SyncStatus } from '../SyncStatus';
import { useEffect } from 'react';

interface SettingsViewProps {
  setView: (v: View | 'back') => void;
  logoUrl: string;
  onRefresh?: () => void;
  userName?: string;
  userEmail?: string;
}

export const SettingsView = ({ setView, logoUrl, onRefresh, userName, userEmail }: SettingsViewProps) => {
  const [activeSection, setActiveSection] = useState('Geral');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    const checkGoogleConnection = async () => {
      try {
        const { data: { user } } = await supabaseService.supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabaseService.supabase
            .from('google_auth')
            .select('user_id')
            .eq('user_id', user.id)
            .single();
          
          setIsGoogleConnected(!!data && !error);
        }
      } catch (e) {
        console.error('Error checking Google connection:', e);
      }
    };

    checkGoogleConnection();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
        setSyncStatus('success');
        setSyncMessage('Google Calendar conectado com sucesso!');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      if (url) {
        window.open(url, 'google_auth', 'width=600,height=700');
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      setSyncStatus('error');
      setSyncMessage('Erro ao iniciar conexão com Google.');
    }
  };

  const handleSyncData = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl === 'https://example.com') {
      setSyncStatus('error');
      setSyncMessage('Por favor, configure a URL do Supabase primeiro nas configurações do projeto.');
      return;
    }

    setSyncStatus('syncing');
    try {
      // Flatten SPREADSHEET_DATA for seeding
      const appointments = Object.entries(SPREADSHEET_DATA).flatMap(([date, data]) => 
        data.appointments.map(a => ({
          ...a,
          date: date.split('/').reverse().join('-') // Convert DD/MM/YYYY to YYYY-MM-DD
        }))
      );

      await supabaseService.seedDatabase(INITIAL_CLIENTS, appointments);
      if (onRefresh) onRefresh();
      setSyncStatus('success');
      setSyncMessage('Todos os dados das planilhas foram sincronizados com sucesso no seu banco de dados.');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error syncing data:', error);
      setSyncStatus('error');
      const message = error.message || 'Erro desconhecido';
      setSyncMessage(`Erro ao sincronizar: ${message}. Verifique se as tabelas "clients" e "appointments" existem e se as permissões (RLS) permitem a inserção.`);
    }
  };

  const handleExportData = async () => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('Preparando seus dados para exportação...');
      
      const [clientsRes, appointmentsRes] = await Promise.all([
        supabaseService.getClients(1, 1000),
        supabaseService.getAppointments({ pageSize: 1000 })
      ]);

      const data = {
        export_date: new Date().toISOString(),
        user: userEmail,
        clients: clientsRes.data,
        appointments: appointmentsRes.data
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luxe-beauty-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSyncStatus('success');
      setSyncMessage('Dados exportados com sucesso! Guarde este arquivo com segurança.');
    } catch (err) {
      console.error('Export error:', err);
      setSyncStatus('error');
      setSyncMessage('Erro ao exportar dados. Tente novamente.');
    }
  };

  const sections = [
    { id: 'Geral', icon: Settings },
    ...(userEmail === 'luisinhocmj@gmail.com' ? [{ id: 'Dados', icon: RefreshCw }] : []),
    { id: 'Serviços', icon: Scissors },
    { id: 'Horários', icon: Clock },
    { id: 'WhatsApp', icon: MessageSquare },
    { id: 'Google', icon: CalendarIcon },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-8 pb-24 md:pb-8"
    >
      <SyncStatus 
        status={syncStatus} 
        message={syncMessage} 
        onClose={() => setSyncStatus('idle')} 
      />

      <div className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
          <ArrowLeft size={24} className="text-on-surface-variant" />
        </button>
        <h2 className="text-2xl md:text-3xl font-headline font-black text-on-surface">Configurações</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Settings */}
        <div className="w-full lg:w-64 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
                activeSection === section.id ? "bg-primary text-white shadow-lg" : "bg-white text-slate-500 hover:bg-surface-bright"
              )}
            >
              <section.icon size={18} />
              {section.id}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-grow max-w-3xl space-y-6">
            {activeSection === 'Dados' && (
              <div className="bg-white p-6 rounded-3xl shadow-soft space-y-4">
                <h3 className="font-bold text-lg text-on-surface">Integração Supabase</h3>
                <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <RefreshCw size={20} />
                    <h4 className="font-bold">Sincronizar Planilhas</h4>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Clique no botão abaixo para carregar todos os dados das planilhas iniciais (clientes e atendimentos) para o seu banco de dados Supabase.
                  </p>
                  
                  {/* Debug Info */}
                  <div className="p-3 bg-black/5 rounded-xl border border-black/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Status da Conexão:</span>
                      <span className={cn(supabaseService.supabase ? "text-emerald-500" : "text-red-500")}>
                        {supabaseService.supabase ? "● Inicializado" : "○ Não Inicializado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-slate-500">Configuração:</span>
                      <span className="text-slate-700">
                        URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? (supabaseService.supabase ? "✅" : "⚠️ Inválida") : "❌"} | 
                        Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅" : "❌"}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={handleSyncData}
                    disabled={syncStatus === 'syncing'}
                    className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {syncStatus === 'syncing' ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                    {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar com Supabase'}
                  </button>

                  <button 
                    onClick={handleExportData}
                    disabled={syncStatus === 'syncing'}
                    className="w-full bg-surface-container-high text-on-surface py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    <Download size={18} />
                    Exportar Meus Dados (LGPD)
                  </button>

                  <div className="mt-6 p-4 bg-slate-900 rounded-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Script SQL para Supabase (Hardened)</h4>
                      <button 
                        onClick={() => {
                          const sql = `
-- ==========================================
-- MIGRATION: Adicionar colunas se não existirem
-- ==========================================
DO $$ 
BEGIN 
  -- Adiciona deleted_at em clients se não existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.clients ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
  END IF;

  -- Adiciona deleted_at em appointments se não existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.appointments ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
  END IF;

  -- Adiciona notes em appointments se não existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'notes') THEN
      ALTER TABLE public.appointments ADD COLUMN notes TEXT;
    END IF;
  END IF;

  -- MIGRATION: Adicionar ON DELETE CASCADE para permitir excluir usuários
  -- Tenta atualizar as constraints de forma dinâmica para evitar erros de nome
  DO $do$
  DECLARE
    r record;
  BEGIN
    -- Para a tabela clients
    FOR r IN (
      SELECT constraint_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = 'clients' AND column_name = 'user_id' AND table_schema = 'public'
    ) LOOP
      EXECUTE 'ALTER TABLE public.clients DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
    ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- Para a tabela appointments
    FOR r IN (
      SELECT constraint_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = 'appointments' AND column_name = 'user_id' AND table_schema = 'public'
    ) LOOP
      EXECUTE 'ALTER TABLE public.appointments DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END $do$;
END $$;

-- 1. Tabela de Perfis (Billing & Roles)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  plan          TEXT NOT NULL DEFAULT 'trial',        -- trial | basic | pro
  subscription_status TEXT NOT NULL DEFAULT 'active', -- active | past_due | canceled | trialing
  stripe_customer_id  TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  last_stripe_event_at TIMESTAMPTZ,                   -- Para evitar eventos fora de ordem
  trial_ends_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_end TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cria o perfil automaticamente quando um usuário faz signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabela de Clientes (Multi-tenant)
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'Novo',
  last_visit TEXT,
  service TEXT,
  total TEXT DEFAULT 'R$ 0,00',
  img TEXT,
  initial TEXT,
  origin TEXT,
  referred_by TEXT,
  next_visit TEXT,
  deleted_at TIMESTAMPTZ, -- Soft Delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT clients_origin_check CHECK (origin IN ('Instagram', 'Facebook', 'TikTok', 'Google', 'Indicação', 'Passando na rua', 'Cliente antiga', 'Vizinha')),
  UNIQUE(user_id, name)
);

-- 3. Tabela de Agendamentos (Relacional)
CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT,
  service TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  time TEXT,
  payment TEXT,
  date DATE NOT NULL,
  notes TEXT,
  deleted_at TIMESTAMPTZ, -- Soft Delete
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (Isolamento + LGPD Compliance)
-- Otimizado: Políticas separadas por operação para melhor performance.

DROP POLICY IF EXISTS "profiles: leitura própria" ON profiles;
CREATE POLICY "profiles: leitura própria" ON profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: escrita própria" ON profiles;
CREATE POLICY "profiles: escrita própria" ON profiles 
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CLIENTES
DROP POLICY IF EXISTS "clients: select próprio" ON clients;
CREATE POLICY "clients: select próprio" ON clients 
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "clients: insert ativo" ON clients;
CREATE POLICY "clients: insert ativo" ON clients 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "clients: update ativo" ON clients;
CREATE POLICY "clients: update ativo" ON clients 
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "clients: delete ativo" ON clients;
CREATE POLICY "clients: delete ativo" ON clients 
  FOR DELETE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

-- AGENDAMENTOS
DROP POLICY IF EXISTS "appointments: select próprio" ON appointments;
CREATE POLICY "appointments: select próprio" ON appointments 
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "appointments: insert ativo" ON appointments;
CREATE POLICY "appointments: insert ativo" ON appointments 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "appointments: update ativo" ON appointments;
CREATE POLICY "appointments: update ativo" ON appointments 
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS "appointments: delete ativo" ON appointments;
CREATE POLICY "appointments: delete ativo" ON appointments 
  FOR DELETE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND subscription_status IN ('active', 'trialing')
    )
  );

-- 6. Índices de Performance (Compostos para Dashboard)
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
                          `;
                          navigator.clipboard.writeText(sql.trim());
                          alert('Script SQL de Produção copiado! Execute no SQL Editor do Supabase.');
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Copiar SQL de Produção
                      </button>
                    </div>
                    <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg">
{`CREATE TABLE IF NOT EXISTS clients (...);
CREATE TABLE IF NOT EXISTS appointments (...);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;`}
                    </pre>
                    <p className="text-[10px] text-slate-500 mt-2 italic">
                      * Execute este script no SQL Editor do seu projeto Supabase antes de sincronizar.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === 'Geral' && (
              <div className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b border-outline-variant/10">
                <div className="relative w-20 h-20 rounded-2xl border-4 border-primary/10 p-1 overflow-hidden bg-brand-gradient flex items-center justify-center text-white">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                  ) : (
                    <Sparkles size={32} fill="currentColor" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{userName || 'Especialista'}</h3>
                  <p className="text-on-surface-variant">{userEmail || 'Plano Profissional'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-outline uppercase tracking-widest">Preferências do Sistema</h4>
                {[
                  { label: 'Notificações via WhatsApp', icon: MessageSquare, active: true },
                  { label: 'Lembretes Automáticos', icon: Bell, active: true },
                  { label: 'Backup na Nuvem', icon: RefreshCw, active: false },
                  { label: 'Modo Escuro', icon: Star, active: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className="text-primary" />
                      <span className="font-medium text-on-surface">{item.label}</span>
                    </div>
                    <div className={cn("w-12 h-6 rounded-full p-1 transition-colors cursor-pointer", item.active ? "bg-primary" : "bg-slate-300")}>
                      <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", item.active ? "translate-x-6" : "translate-x-0")}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'Serviços' && (
            <div className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-on-surface">Gestão de Serviços</h3>
                <button className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {HAIR_SERVICES.map((service, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl group">
                    <div className="flex items-center gap-3">
                      <Scissors size={18} className="text-primary" />
                      <span className="font-medium text-on-surface">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-primary">R$ {service.price}</span>
                      <button className="p-2 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'Horários' && (
            <div className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
              <h3 className="text-xl font-bold text-on-surface">Horários de Atendimento</h3>
              <div className="space-y-3">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                  <div key={day} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <span className="font-medium text-on-surface">{day}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-500">{i < 5 ? '09:00 - 19:00' : i === 5 ? '09:00 - 14:00' : 'Fechado'}</span>
                      <div className={cn("w-10 h-5 rounded-full p-1 transition-colors cursor-pointer", i < 6 ? "bg-emerald-500" : "bg-slate-300")}>
                        <div className={cn("w-3 h-3 bg-white rounded-full transition-transform", i < 6 ? "translate-x-5" : "translate-x-0")}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'WhatsApp' && (
            <div className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
              <h3 className="text-xl font-bold text-on-surface">Template de Mensagem</h3>
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">Esta mensagem será enviada automaticamente nos lembretes de retorno.</p>
                <textarea 
                  className="w-full h-40 bg-surface-container-low border-none rounded-2xl p-4 text-sm text-on-surface focus:ring-2 ring-primary/20 resize-none"
                  defaultValue="Olá {nome}, aqui é da Estética Fernanda Ayres! Notamos que já faz um tempo desde sua última visita para {servico}. Gostaria de agendar um retorno?"
                />
                <div className="flex flex-wrap gap-2">
                  {['{nome}', '{servico}', '{data}', '{horario}'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold cursor-pointer hover:bg-primary/20">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeSection === 'Google' && (
            <div className="bg-white p-8 rounded-3xl shadow-soft space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <CalendarIcon size={24} />
                <h3 className="text-xl font-bold text-on-surface">Google Calendar</h3>
              </div>
              
              <div className="p-6 bg-surface-container-low rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-on-surface">Sincronização Automática</h4>
                    <p className="text-sm text-on-surface-variant">Agendamentos criados no app serão adicionados ao seu Google Agenda.</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    isGoogleConnected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {isGoogleConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                </div>

                {!isGoogleConnected ? (
                  <button 
                    onClick={handleConnectGoogle}
                    className="w-full bg-white border-2 border-outline-variant/20 text-on-surface py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-surface-bright transition-all active:scale-95"
                  >
                    <Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
                    Conectar com Google Calendar
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700">
                      <Sparkles size={20} />
                      <p className="text-xs font-medium">Sua agenda está integrada! Novos atendimentos serão salvos automaticamente.</p>
                    </div>
                    <button 
                      onClick={() => setIsGoogleConnected(false)}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      Desconectar conta Google
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Atenção</h5>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Para que a integração funcione, você precisa configurar o <b>Google Client ID</b> e o <b>Secret</b> nas configurações do projeto. 
                  O script SQL abaixo também deve ser executado para criar a tabela de autenticação.
                </p>
                <button 
                  onClick={() => {
                    const sql = `
CREATE TABLE IF NOT EXISTS google_auth (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_auth: acesso próprio" ON google_auth FOR ALL USING (auth.uid() = user_id);
                    `;
                    navigator.clipboard.writeText(sql.trim());
                    alert('Script SQL para Google Auth copiado!');
                  }}
                  className="mt-3 text-[10px] font-bold text-amber-800 underline"
                >
                  Copiar SQL para Google Auth
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
