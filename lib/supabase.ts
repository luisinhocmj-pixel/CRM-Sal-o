import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (typeof window === 'undefined') {
  console.log('Ambiente Server-side. Chaves disponíveis:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_') || k.startsWith('SUPABASE')));
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: Chaves API não encontradas. Verifique se os nomes nos "Secrets" estão completos: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

if (supabaseUrl && !isValidUrl(supabaseUrl)) {
  console.error('Supabase: URL inválida:', supabaseUrl);
}

export const supabase = (supabaseUrl && isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (supabase) {
  console.log('Supabase: Cliente inicializado com sucesso.');
}
