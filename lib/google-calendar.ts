import { google } from 'googleapis';
import { supabase } from './supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

export const getGoogleAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const saveTokens = async (userId: string, tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) => {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { error } = await supabase
    .from('google_auth')
    .upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
};

export const getCalendarClient = async (userId: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('google_auth')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date
  });

  // Handle token refresh automatically
  client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await saveTokens(userId, tokens);
    } else {
      await saveTokens(userId, { ...tokens, refresh_token: data.refresh_token });
    }
  });

  return google.calendar({ version: 'v3', auth: client });
};

export const createCalendarEvent = async (userId: string, appointment: { client_name: string; service: string; value: number; time: string; date: string; notes?: string }) => {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return null;

  const [hours, minutes] = appointment.time.split(':');
  const startDateTime = new Date(appointment.date);
  startDateTime.setHours(parseInt(hours), parseInt(minutes));

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour

  const event = {
    summary: `Atendimento: ${appointment.client_name}`,
    description: `Serviço: ${appointment.service}\nValor: R$ ${appointment.value}\nNotas: ${appointment.notes || ''}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
  };

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return res.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
};
