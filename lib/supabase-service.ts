import { supabase } from './supabase';
import { z } from 'zod';

export { supabase };

// --- SCHEMAS ---

export const ClientSchema = z.object({
  id: z.number().optional(),
  user_id: z.string().optional(),
  name: z.string().min(2, 'Nome muito curto').max(100),
  phone: z.string().min(8, 'Telefone inválido'),
  status: z.enum(['VIP', 'Regular', 'Novo', 'Inativo', 'Cliente antiga']),
  lastVisit: z.string().optional(),
  service: z.string().optional(),
  total: z.string().optional(),
  img: z.string().url().optional().or(z.literal('')),
  initial: z.string().optional(),
  origin: z.enum(['Instagram', 'Facebook', 'TikTok', 'Google', 'Google Maps', 'Indicação', 'Passando na rua', 'Cliente antiga', 'Vizinha']).optional(),
  referredBy: z.string().or(z.number()).optional(),
  nextVisit: z.string().optional(),
});

export const AppointmentSchema = z.object({
  id: z.number().optional(),
  user_id: z.string().optional(),
  client_id: z.number(),
  client_name: z.string().min(1, 'Nome da cliente é obrigatório'),
  service: z.string().min(2, 'Serviço é obrigatório'),
  value: z.number().min(0, 'Valor não pode ser negativo'),
  time: z.string(),
  payment: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  notes: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;

export type View = 'dashboard' | 'clients' | 'appointments' | 'returns' | 'agenda' | 'client-detail' | 'new-appointment' | 'new-client' | 'financial-detail' | 'settings' | 'notifications';

// --- HELPERS ---

const handleSupabaseError = (error: unknown, context: string) => {
  let message = 'Erro desconhecido';
  let status = 500;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    message = typeof errObj.message === 'string' ? errObj.message : 'Erro desconhecido';
    status = typeof errObj.status === 'number' ? errObj.status : 500;
  }

  console.error(`Supabase Error [${context}]:`, error);
  
  // Se o erro for 402 (Payment Required), redirecionamos ou avisamos
  if (status === 402) {
    message = 'Assinatura necessária para realizar esta ação.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('billing-required'));
    }
  }

  // Disparamos um evento customizado para que a UI possa reagir globalmente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-error', { detail: { message, context, status } }));
  }
  
  throw new Error(`Erro ao ${context}: ${message}`);
};

export const getClients = async (page = 1, pageSize = 20, search = '') => {
  if (!supabase) return { data: [], count: 0 };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(from, to);
  
  if (error) throw error;
  
  const clients = (data || []).map(c => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    phone: c.phone,
    status: c.status,
    lastVisit: c.last_visit,
    service: c.service,
    total: c.total,
    img: c.img,
    initial: c.initial,
    origin: c.origin,
    referredBy: c.referred_by,
    nextVisit: c.next_visit
  })) as Client[];

  return { data: clients, count: count || 0 };
};

export const createClient = async (client: Partial<Client>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Validate
  const validated = ClientSchema.parse({
    ...client,
    user_id: user.id,
    status: client.status || 'Novo',
    total: client.total || 'R$ 0,00',
    lastVisit: client.lastVisit || new Date().toISOString().split('T')[0]
  });

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name: validated.name,
      phone: validated.phone,
      status: validated.status,
      last_visit: validated.lastVisit,
      service: validated.service,
      total: validated.total,
      img: validated.img,
      initial: validated.initial,
      origin: validated.origin,
      referred_by: String(validated.referredBy || ''),
      next_visit: validated.nextVisit
    })
    .select()
    .single();
  
  if (error) handleSupabaseError(error, 'criar cliente');
  return data as Client;
};

export const updateClient = async (id: number, client: Partial<Client>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase
    .from('clients')
    .update({
      name: client.name,
      phone: client.phone,
      status: client.status,
      last_visit: client.lastVisit,
      service: client.service,
      total: client.total,
      img: client.img,
      initial: client.initial,
      origin: client.origin,
      referred_by: String(client.referredBy || ''),
      next_visit: client.nextVisit
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Client;
};

export const saveClient = async (client: Partial<Client>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase
    .from('clients')
    .upsert(client)
    .select()
    .single();
  
  if (error) throw error;
  return data as Client;
};

export const deleteClient = async (id: number) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  // 1. Get client name first to delete appointments
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', id)
    .single();

  if (client) {
    // 2. Delete appointments
    await supabase
      .from('appointments')
      .delete()
      .eq('client_name', client.name);
  }

  // 3. Delete client
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export interface GetAppointmentsOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const getAppointments = async (options: GetAppointmentsOptions = {}) => {
  if (!supabase) return { data: [], count: 0 };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0 };

  const { date, startDate, endDate, page = 1, pageSize = 50 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('appointments')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);
  
  if (date) {
    query = query.eq('date', date);
  } else if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate);
  } else if (startDate) {
    query = query.gte('date', startDate);
  } else if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error, count } = await query
    .order('time', { ascending: true })
    .range(from, to);

  if (error) throw error;
  
  const appointments = (data || []).map(a => ({
    id: a.id,
    user_id: a.user_id,
    client_id: a.client_id,
    client_name: a.client_name,
    service: a.service,
    value: a.value,
    time: a.time,
    payment: a.payment,
    date: a.date,
    notes: a.notes
  })) as Appointment[];

  return { data: appointments, count: count || 0 };
};

export const getFinancialSummary = async (startDate: string, endDate: string) => {
  if (!supabase) return { total: 0, count: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, count: 0 };

  const { data, error, count } = await supabase
    .from('appointments')
    .select('value', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) handleSupabaseError(error, 'buscar resumo financeiro');

  const total = (data || []).reduce((acc, curr) => acc + (curr.value || 0), 0);
  return {
    total,
    count: count || 0
  };
};

export const saveAppointment = async (appointment: Appointment) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Validate
  const validated = AppointmentSchema.parse({
    ...appointment,
    user_id: user.id
  });

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: user.id,
      client_id: validated.client_id,
      client_name: validated.client_name,
      service: validated.service,
      value: validated.value,
      time: validated.time,
      payment: validated.payment,
      date: validated.date,
      notes: validated.notes
    })
    .select()
    .single();
  
  if (error) handleSupabaseError(error, 'salvar agendamento');
  return data as Appointment;
};

export const seedDatabase = async (initialClients: Client[], appointments: { client: string; service: string; value: number; time: string; payment: string; date: string }[]) => {
  if (!supabase) throw new Error('Supabase não inicializado. Verifique as chaves API.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado para sincronização.');

  console.log('Iniciando sincronização robusta...');

  // 1. Get existing clients to avoid duplicates and map names to IDs
  const { data: existingClientsData, error: fetchError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id);

  if (fetchError) throw fetchError;

  // Normalize helper
  const normalize = (name: string) => name.trim().toLowerCase();

  const clientMap = new Map<string, number>();
  (existingClientsData || []).forEach(c => {
    clientMap.set(normalize(c.name), c.id);
  });

  // 2. Sync Clients (Upsert)
  console.log('Sincronizando clientes...');
  const clientsToUpsert = initialClients.map(c => ({
    user_id: user.id,
    name: c.name,
    phone: c.phone || '',
    status: c.status || 'Novo',
    last_visit: c.lastVisit || null,
    service: c.service || '',
    total: c.total || 'R$ 0,00',
    img: c.img || null,
    initial: c.initial || c.name[0],
    origin: c.origin || 'Indicação',
    referred_by: String(c.referredBy || ''),
    next_visit: c.nextVisit || null
  }));

  const { data: upsertedClients, error: clientError } = await supabase
    .from('clients')
    .upsert(clientsToUpsert, { onConflict: 'user_id, name' })
    .select();

  if (clientError) {
    console.error('Erro ao sincronizar clientes:', clientError);
    throw new Error(`Erro nos Clientes: ${clientError.message}`);
  }

  // Update map with newly upserted clients
  (upsertedClients || []).forEach(c => {
    clientMap.set(normalize(c.name), c.id);
  });

  console.log('Clientes sincronizados. Processando agendamentos...');

  // 3. Process Appointments (Ensure client_id exists)
  const appointmentsToInsert = [];
  
  for (const appt of appointments) {
    const normalizedName = normalize(appt.client);
    let clientId = clientMap.get(normalizedName);

    // If client doesn't exist, create it on the fly
    if (!clientId) {
      console.log(`Cliente "${appt.client}" não encontrado. Criando automaticamente...`);
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: appt.client,
          phone: '',
          status: 'Novo',
          total: 'R$ 0,00',
          initial: appt.client[0]
        })
        .select()
        .single();
      
      if (createError) {
        console.warn(`Falha ao criar cliente "${appt.client}":`, createError);
        continue; // Skip this appointment if client creation fails
      }
      
      if (!newClient?.id) {
        console.warn(`Falha ao obter ID da nova cliente "${appt.client}"`);
        continue;
      }

      clientId = newClient.id;
      clientMap.set(normalizedName, clientId);
    }

    appointmentsToInsert.push({
      user_id: user.id,
      client_id: clientId,
      client_name: appt.client,
      service: appt.service,
      value: appt.value,
      time: appt.time,
      payment: appt.payment,
      date: appt.date,
      notes: ''
    });
  }

  // 4. Clear and Insert Appointments
  // We delete only the current user's appointments to be safe
  await supabase
    .from('appointments')
    .delete()
    .eq('user_id', user.id);

  const { error: apptError } = await supabase
    .from('appointments')
    .insert(appointmentsToInsert);

  if (apptError) {
    console.error('Erro ao sincronizar agendamentos:', apptError);
    throw new Error(`Erro nos Agendamentos: ${apptError.message}`);
  }

  console.log('Sincronização concluída com sucesso!');
};
