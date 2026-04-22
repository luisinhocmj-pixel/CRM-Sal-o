'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Scissors, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export const AuthView = ({ onAuthSuccess }: AuthViewProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        if (!supabase) throw new Error('Serviço de autenticação não configurado');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!supabase) throw new Error('Serviço de autenticação não configurado');
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        alert('Verifique seu e-mail para confirmar o cadastro!');
      }
      onAuthSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Ocorreu um erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8fd] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-primary/10 p-8 md:p-12 border border-primary/5"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-brand-gradient rounded-3xl flex items-center justify-center text-white shadow-lg mb-6 rotate-3">
            <Scissors size={40} />
          </div>
          <h1 className="text-3xl font-headline font-black text-on-surface mb-2 tracking-tight">
            Luxe Beauty <span className="text-primary">CRM</span>
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">
            {isLogin ? 'Bem-vinda de volta, especialista.' : 'Comece sua jornada de gestão premium.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="seu@email.com"
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-error text-xs font-bold text-center bg-error/5 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gradient text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar no Sistema' : 'Criar Minha Conta')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-primary hover:underline block w-full"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-outline-variant/10 flex items-center justify-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest">
          <Sparkles size={12} className="text-primary" />
          Powered by Luxe Beauty Tech
        </div>
      </motion.div>
    </div>
  );
};
