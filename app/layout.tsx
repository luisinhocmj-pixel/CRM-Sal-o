import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { headers } from 'next/headers';
import { AlertTriangle } from 'lucide-react';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Luxe Beauty CRM',
  description: 'Premium management platform for aestheticians.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const billingStatus = headerList.get('x-billing-status');

  return (
    <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning className="bg-[#faf8fd] text-[#1b1b1f] antialiased">
        {billingStatus && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-bold sticky top-0 z-[100] shadow-md">
            <AlertTriangle size={18} />
            <span>
              {billingStatus === 'past_due' 
                ? 'Sua assinatura está atrasada. Regularize para continuar adicionando novos dados.' 
                : 'Seu período de teste expirou. Assine um plano para continuar crescendo.'}
            </span>
            <a href="/billing" className="bg-white text-amber-600 px-4 py-1 rounded-full text-xs hover:bg-amber-50 transition-colors ml-2">
              Regularizar Agora
            </a>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
