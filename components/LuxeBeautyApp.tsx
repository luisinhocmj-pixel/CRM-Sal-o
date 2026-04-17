'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { DashboardView } from './views/DashboardView';
import { ClientsView } from './views/ClientsView';
import { AgendaView } from './views/AgendaView';
import { ReturnsView } from './views/ReturnsView';
import { SettingsView } from './views/SettingsView';
import { ClientDetailView } from './views/ClientDetailView';
import { NewClientView } from './views/NewClientView';
import { NewAppointmentView } from './views/NewAppointmentView';
import { FinancialDetailView } from './views/FinancialDetailView';
import { NotificationsView } from './views/NotificationsView';
import { AuthView } from './views/AuthView';
import { ErrorBoundary } from './ErrorBoundary';
import { FloatingActionButton } from './FloatingActionButton';
import { Client, View, Appointment } from '@/lib/supabase-service';
import { Session } from '@supabase/supabase-js';
import * as supabaseService from '@/lib/supabase-service';

export default function LuxeBeautyApp() {
  const [view, setView] = useState<View>('dashboard');
  const [, setViewHistory] = useState<View[]>(['dashboard']);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [financialState, setFinancialState] = useState({
    level: 'daily',
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [logoUrl] = useState('https://picsum.photos/seed/luxe/200/200');
  
  const handleSetView = React.useCallback((newView: View | 'back') => {
    if (newView === 'back') {
      setViewHistory(prev => {
        if (prev.length > 1) {
          const newHistory = [...prev];
          newHistory.pop(); // Remove current view
          const previous = newHistory[newHistory.length - 1];
          setView(previous);
          return newHistory;
        } else {
          setView('dashboard');
          return ['dashboard'];
        }
      });
    } else {
      setView(prevView => {
        if (newView === prevView) return prevView;
        
        if (newView === 'dashboard') {
          setViewHistory(['dashboard']);
          return 'dashboard';
        }
        
        setViewHistory(prev => [...prev, newView]);
        return newView;
      });
    }
  }, []);

  const loadData = React.useCallback(async () => {
    if (!session) return;
    try {
      const [clientsRes, appointmentsRes] = await Promise.all([
        supabaseService.getClients(1, 100), // Get first 100 for dashboard/agenda
        supabaseService.getAppointments({ pageSize: 100 })
      ]);
      
      if (clientsRes.data) setClients(clientsRes.data);
      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Auth listener
  useEffect(() => {
    supabaseService.supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsLoading(false);
    });

    const { data: { subscription } } = supabaseService.supabase!.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      setSession(session);
      
     if (event === 'SIGNED_OUT') {
  setClients([]);
  setAppointments([]);
  setIsLoading(false);
};
        handleSetView('dashboard'); // Reset to root
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        loadData(); // Re-fetch to ensure data is fresh with new token
      } else if (event === 'SIGNED_IN' && session) {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [handleSetView, loadData]);

  // Load data when session changes
  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  const handleSetFinancialType = (type: string) => {
    setFinancialState({
      level: type,
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate()
    });
    handleSetView('financial-detail');
  };

  const handleFinancialMenuClick = () => {
    handleSetFinancialType('daily');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    handleSetView('client-detail');
  };

  const handleSaveAppointment = async (apptData: Appointment & { next_visit?: string }) => {
    try {
      // Separate appointment data from client update data
      const { next_visit, ...appointment } = apptData;
      
      await supabaseService.saveAppointment(appointment);
      
      // Create Google Calendar event if connected (background)
      fetch('/api/calendar/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment })
      }).catch(err => console.error('Silent failure creating calendar event:', err));
      
      // Update client stats in the local state for immediate feedback
      const client = clients.find(c => c.id === apptData.client_id);
      if (client) {
        const currentTotal = parseFloat(client.total?.replace('R$ ', '').replace('.', '').replace(',', '.') || '0') || 0;
        const newTotal = currentTotal + apptData.value;
        const formattedTotal = `R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        const updatedClient: Partial<Client> = {
          lastVisit: apptData.date,
          total: formattedTotal,
          service: apptData.service,
          nextVisit: next_visit || client.nextVisit
        };
        
        await supabaseService.updateClient(client.id!, updatedClient);
      }
      
      await loadData();
      handleSetView('dashboard');
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar atendimento');
      throw error;
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setView('new-client');
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (editingClient) {
        const updated = await supabaseService.updateClient(editingClient.id, clientData);
        if (updated) {
          setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c));
        }
      } else {
        const created = await supabaseService.createClient(clientData);
        if (created) {
          setClients([...clients, created]);
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setEditingClient(null);
    }
  };

  const handleDeleteClient = async (id: number) => {
    try {
      await supabaseService.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      setAppointments(appointments.filter(a => a.client_id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const renderView = () => {

    switch (view) {
      case 'dashboard':
        return (
          <DashboardView 
            clients={clients} 
            setView={handleSetView}
            setFinancialType={handleSetFinancialType}
            userName={session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0]}
          />
        );
      case 'clients':
        return (
          <ClientsView 
            onSelectClient={handleSelectClient} 
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            setView={handleSetView}
            searchQuery={searchQuery}
          />
        );
      case 'agenda':
        return <AgendaView setView={handleSetView} onSelectClient={handleSelectClient} clients={clients} />;
      case 'returns':
        return <ReturnsView setView={handleSetView} onSelectClient={handleSelectClient} clients={clients} />;
      case 'settings':
        return (
          <SettingsView 
            setView={handleSetView} 
            logoUrl={logoUrl} 
            onRefresh={loadData} 
            userName={session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0]}
            userEmail={session?.user?.email}
          />
        );
      case 'client-detail':
        return <ClientDetailView setView={handleSetView} client={selectedClient} clients={clients} appointments={appointments} onEditClient={handleEditClient} onSelectClient={handleSelectClient} />;
      case 'new-client':
        return (
          <NewClientView 
            setView={handleSetView} 
            onSave={handleSaveClient} 
            editingClient={editingClient} 
            clients={clients}
          />
        );
      case 'new-appointment':
        return <NewAppointmentView setView={handleSetView} clients={clients} onSave={handleSaveAppointment} />;
      case 'financial-detail':
        return (
          <FinancialDetailView 
            setView={handleSetView} 
            type={financialState.level} 
            clients={clients} 
            onSelectClient={handleSelectClient}
            externalState={financialState}
            setExternalState={setFinancialState}
          />
        );
      case 'notifications':
        return <NotificationsView setView={handleSetView} onSelectClient={handleSelectClient} clients={clients} />;
      default:
        return <DashboardView clients={clients} setView={handleSetView} setFinancialType={handleSetFinancialType} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8fd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-primary animate-pulse">Carregando Luxo...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthView onAuthSuccess={() => {}} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-surface-bright font-sans text-on-surface selection:bg-primary/10 selection:text-primary">
        <Sidebar view={view} setView={handleSetView} onFinancialClick={handleFinancialMenuClick} />
        
        <main className="flex-grow flex flex-col min-w-0">
          <TopBar 
            view={view} 
            setView={handleSetView} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            clients={clients}
            onSelectClient={handleSelectClient}
            onFinancialClick={handleFinancialMenuClick}
          />
          
          <div className="flex-grow overflow-y-auto">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <ErrorBoundary key={view}>
                  <div>
                    {renderView()}
                  </div>
                </ErrorBoundary>
              )}
            </AnimatePresence>
          </div>
        </main>

        <FloatingActionButton setView={handleSetView} />
      </div>
    </ErrorBoundary>
  );
}
