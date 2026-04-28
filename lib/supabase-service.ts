import { supabase } from './supabase';
import { z } from 'zod';
import { User } from '@supabase/supabase-js';

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

export const ProfileSchema = z.object({
  id: z.string(),
  salon_name: z.string().min(1, 'Nome do salão é obrigatório'),
  email: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

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

  // Se o erro for um objeto vazio {} mas ainda for um erro
  if (message === 'Erro desconhecido' && typeof error === 'object') {
    try {
      const stringified = JSON.stringify(error);
      if (stringified === '{}') {
        message = 'Permissão negada (RLS) ou erro de conexão';
      } else {
        message = stringified;
      }
    } catch {
      message = 'Erro estrutural no banco de dados';
    }
  }

  console.error(`Supabase Error [${context}]:`, error);
  
  if (status === 402) {
    message = 'Assinatura necessária para realizar esta ação.';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('billing-required'));
    }
  }

  if (typeof window !== 'undefined') {
    // Only dispatch if it's not a background fetch oscillation
    if (!message.includes('fetch') && !message.includes('network')) {
      window.dispatchEvent(new CustomEvent('app-error', { detail: { message, context, status } }));
    }
  }
  
  throw new Error(`Erro ao ${context}: ${message}`);
};

let cachedUser: User | null = null;
let userPromise: Promise<User | null> | null = null;

const getAuthenticatedUser = async () => {
  if (cachedUser) return cachedUser;
  if (userPromise) return userPromise;

  userPromise = (async () => {
    try {
      if (!supabase) return null;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        cachedUser = null;
        return null;
      }
      cachedUser = user;
      return user;
    } catch (err) {
      console.error('Auth check failed:', err);
      return null;
    } finally {
      userPromise = null;
    }
  })();

  return userPromise;
};

export const getProfile = async () => {
  if (!supabase) return null;
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ id: user.id, salon_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Meu Salão' })
        .select()
        .single();
      if (createError) {
        handleSupabaseError(createError, 'criar perfil inicial');
        return null;
      }
      return newProfile as Profile;
    }
    console.warn('getProfile unexpected error:', error);
    return null;
  }
  return data as Profile;
};

export const updateProfile = async (salonName: string) => {
  if (!supabase) throw new Error('Supabase not initialized');
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, salon_name: salonName })
    .select()
    .single();

  if (error) handleSupabaseError(error, 'atualizar perfil');
  return data as Profile;
};

export interface SupabaseHealthResult {
  ok: boolean;
  details: Record<string, boolean>;
  error?: unknown;
}

export const checkDatabaseHealth = async (): Promise<SupabaseHealthResult> => {
  if (!supabase) return { ok: false, details: {}, error: 'Supabase não inicializado' };
  
  const results: Record<string, boolean> = {
    profiles: false,
    clients: false,
    appointments: false,
    salon_name_col: false,
    client_name_col: false,
  };

  try {
    // Check tables
    const [p, c, a] = await Promise.all([
      supabase.from('profiles').select('id').limit(1),
      supabase.from('clients').select('id').limit(1),
      supabase.from('appointments').select('id').limit(1),
    ]);

    results.profiles = !p.error || p.error.code !== 'PGRST116';
    results.clients = !c.error;
    results.appointments = !a.error;

    // Check specific columns
    const [col1, col2] = await Promise.all([
      supabase.from('profiles').select('salon_name').limit(1),
      supabase.from('appointments').select('client_name').limit(1),
    ]);
    results.salon_name_col = !col1.error;
    results.client_name_col = !col2.error;

    return { ok: results.profiles && results.clients && results.appointments && results.salon_name_col && results.client_name_col, details: results };
  } catch (err) {
    return { ok: false, details: results, error: err };
  }
};

export const getClients = async (page = 1, pageSize = 20, search = '', retries = 2): Promise<{ data: Client[]; count: number }> => {
  if (!supabase) return { data: [], count: 0 };
  
  try {
    const user = await getAuthenticatedUser();
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
    
    if (error) {
      if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.warn(`Retry getClients (${retries}): ${error.message}`);
        await new Promise(r => setTimeout(r, 1000));
        return getClients(page, pageSize, search, retries - 1);
      }
      console.error('getClients Supabase error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`getClients: Nenhum resultado para o usuário ${user.id} (Busca: "${search}")`);
    }
    
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
  } catch (err) {
    console.error('getClients fatal error:', err);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return getClients(page, pageSize, search, retries - 1);
    }
    throw err;
  }
};

export const createClient = async (client: Partial<Client>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const user = await getAuthenticatedUser();
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
  
  // Mapeamento de campos para o banco (snake_case)
  const updateData: Record<string, string | number | null> = {};
  if (client.name !== undefined) updateData.name = client.name;
  if (client.phone !== undefined) updateData.phone = client.phone;
  if (client.status !== undefined) updateData.status = client.status;
  if (client.lastVisit !== undefined) updateData.last_visit = client.lastVisit;
  if (client.service !== undefined) updateData.service = client.service;
  if (client.total !== undefined) updateData.total = client.total;
  if (client.img !== undefined) updateData.img = client.img;
  if (client.initial !== undefined) updateData.initial = client.initial;
  if (client.origin !== undefined) updateData.origin = client.origin;
  if (client.referredBy !== undefined) updateData.referred_by = String(client.referredBy || '');
  if (client.nextVisit !== undefined) updateData.next_visit = client.nextVisit;

  const { data, error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', (await getAuthenticatedUser())?.id)
    .select()
    .single();
  
  if (error) handleSupabaseError(error, 'atualizar cliente');
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

export const getAppointments = async (options: GetAppointmentsOptions = {}, retries = 2): Promise<{ data: Appointment[]; count: number }> => {
  if (!supabase) return { data: [], count: 0 };
  
  try {
    const user = await getAuthenticatedUser();
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

    if (error) {
      if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        await new Promise(r => setTimeout(r, 1000));
        return getAppointments(options, retries - 1);
      }
      console.error('getAppointments Supabase error:', error);
      throw error;
    }
    
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
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return getAppointments(options, retries - 1);
    }
    throw err;
  }
};

export const getFinancialSummary = async (startDate: string, endDate: string, retries = 2): Promise<{ total: number; count: number }> => {
  if (!supabase) return { total: 0, count: 0 };

  try {
    const user = await getAuthenticatedUser();
    if (!user) return { total: 0, count: 0 };

    const { data, error, count } = await supabase
      .from('appointments')
      .select('value', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      // Retry on network errors without flooding log
      if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        await new Promise(r => setTimeout(r, 1000 / retries));
        return getFinancialSummary(startDate, endDate, retries - 1);
      }
      
      // For actual database errors, log once
      console.warn(`Financial Summary [${startDate} to ${endDate}]:`, error.message);
      return { total: 0, count: 0 };
    }

    const total = (data || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    return {
      total,
      count: count || 0
    };
  } catch {
    // Silent catch for network oscillation
    return { total: 0, count: 0 };
  }
};

export const saveAppointment = async (appointment: Appointment) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('User not authenticated');

  // Validate
  let validated;
  try {
    validated = AppointmentSchema.parse({
      ...appointment,
      user_id: user.id
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Dados inválidos: ${issues}`);
    }
    throw err;
  }

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
  
  if (error) {
    console.error('saveAppointment error detail:', JSON.stringify(error, null, 2));
    handleSupabaseError(error, 'salvar agendamento');
  }
  return data as Appointment;
};

export const seedDatabase = async (initialClients: Client[], appointments: { client: string; service: string; value: number; time: string; payment: string; date: string }[]) => {
  if (!supabase) throw new Error('Supabase não inicializado. Verifique as chaves API.');

  const user = await getAuthenticatedUser();
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
      clientMap.set(normalizedName, clientId!);
    }

    appointmentsToInsert.push({
      user_id: user.id,
      client_id: clientId!,
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
