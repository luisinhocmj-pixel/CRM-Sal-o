'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, RefreshCw, Scissors, Clock, MessageSquare, 
  ArrowLeft, Download, Bell, Star, Edit, Plus, Sparkles,
  Calendar as CalendarIcon, AlertCircle, CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { View, Profile } from '@/lib/supabase-service';
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
  profile?: Profile | null;
  healthStatus?: { ok: boolean; details?: Record<string, boolean> } | null;
}

export const SettingsView = ({ setView, logoUrl, onRefresh, userName, userEmail, profile, healthStatus }: SettingsViewProps) => {
  const [activeSection, setActiveSection] = useState('Geral');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [salonName, setSalonName] = useState(profile?.salon_name || userName || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.salon_name) {
      setSalonName(profile.salon_name);
    }
  }, [profile]);

  useEffect(() => {
    const checkGoogleConnection = async () => {
      try {
        const sb = supabaseService.supabase;
        if (!sb) return;
        
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data, error } = await sb
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

  const handleUpdateSalonName = async () => {
    if (!salonName.trim()) return;
    setIsSaving(true);
    try {
      await supabaseService.updateProfile(salonName);
      setSyncStatus('success');
      setSyncMessage('Perfil atualizado com sucesso!');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      setSyncStatus('error');
      setSyncMessage('Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
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
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-on-surface">Configuração do Banco de Dados</h3>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    healthStatus?.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                    {healthStatus?.ok ? 'Configurado' : 'Necessita Ajuste'}
                  </span>
                </div>

                {!healthStatus?.ok && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={18} />
                      <h4 className="font-bold text-sm text-red-600">Estrutura Incompleta</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       {healthStatus?.details && Object.entries(healthStatus.details).map(([key, ok]) => (
                        <div key={key} className="flex items-center gap-2 text-[11px] p-2 bg-white/50 rounded-lg">
                          {ok ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-red-300" />
                          )}
                          <span className={cn("capitalize font-medium", ok ? "text-slate-600" : "text-red-600")}>
                            {key.replace('_col', '').replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <RefreshCw size={20} />
                    <h4 className="font-bold">Sincronizar Planilhas</h4>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Se você já rodou o script abaixo, clique aqui para carregar os dados iniciais.
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

                  <div className="pt-4 mt-2 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-[10px] font-black text-outline uppercase tracking-widest">Script Necesário</h5>
                      <button 
                        onClick={() => {
                          const sql = `
-- 1. Tabelas Base
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  salon_name TEXT,
  plan TEXT NOT NULL DEFAULT 'trial',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT clients_origin_check CHECK (origin IN ('Instagram', 'Facebook', 'TikTok', 'Google', 'Google Maps', 'Indicação', 'Passando na rua', 'Cliente antiga', 'Vizinha')),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  client_id BIGINT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT,
  service TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  time TEXT NOT NULL,
  payment TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrações de Coluna
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salon_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_name TEXT;

-- 3. Desativar RLS (para simplificar a configuração inicial da Fernanda)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
`;
                          navigator.clipboard.writeText(sql.trim());
                          alert('Script SQL copiado! Cole no SQL Editor do Supabase.');
                          window.open('https://supabase.com/dashboard/project/_/sql', '_blank');
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Copiar Script e Abrir Editor
                      </button>
                    </div>
                    <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto p-2 bg-black/30 rounded-lg">
{`CREATE TABLE IF NOT EXISTS clients (...);
CREATE TABLE IF NOT EXISTS appointments (...);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;`}
                    </pre>
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
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-on-surface">{userName || 'Especialista'}</h3>
                  <p className="text-on-surface-variant">{userEmail || 'Plano Profissional'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-outline uppercase tracking-widest">Meu Negócio</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant px-1">NOME DO SALÃO / ESTÉTICA</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={salonName}
                        onChange={(e) => setSalonName(e.target.value)}
                        className="flex-grow bg-surface-container-low border-none rounded-2xl px-4 py-3 text-on-surface focus:ring-2 ring-primary/20 transition-all font-medium"
                        placeholder="Ex: Fernanda Ayres Estética"
                      />
                      <button 
                        onClick={handleUpdateSalonName}
                        disabled={isSaving || salonName === (profile?.salon_name || userName)}
                        className="bg-primary text-white px-6 rounded-2xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-outline uppercase tracking-widest mt-8">Preferências do Sistema</h4>
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
