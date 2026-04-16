import { Client } from './supabase-service';

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 1,
    name: 'Fabiana Ribeiro',
    phone: '(11) 98765-4321',
    status: 'VIP',
    lastVisit: '16/03/2026',
    service: 'Progressiva com formol',
    total: 'R$ 1.250,00',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    initial: 'F',
    origin: 'Instagram',
    referredBy: '',
    nextVisit: '2026-05-15'
  },
  {
    id: 2,
    name: 'Patrícia Mãe da Clara',
    phone: '(11) 91234-5678',
    status: 'Regular',
    lastVisit: '28/03/2026',
    service: 'Alisamento Orgânico',
    total: 'R$ 850,00',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    initial: 'P',
    origin: 'Indicação',
    referredBy: 'Fabiana Ribeiro',
    nextVisit: '2026-05-28'
  },
  {
    id: 3,
    name: 'Juliana Costa',
    phone: '(11) 97777-8888',
    status: 'Novo',
    lastVisit: '10/04/2026',
    service: 'Botox Capilar',
    total: 'R$ 350,00',
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    initial: 'J',
    origin: 'Google Maps',
    referredBy: '',
    nextVisit: ''
  }
];

export const SPREADSHEET_DATA: Record<string, { appointments: { client: string; service: string; value: number; time: string; payment: string }[] }> = {
  '15/04/2026': {
    appointments: [
      { client: 'Fabiana Ribeiro', service: 'Progressiva', value: 350, time: '09:00', payment: 'Pix' },
      { client: 'Juliana Costa', service: 'Botox', value: 250, time: '14:00', payment: 'Cartão' }
    ]
  },
  '16/04/2026': {
    appointments: [
      { client: 'Patrícia Mãe da Clara', service: 'Alisamento', value: 450, time: '10:00', payment: 'Dinheiro' }
    ]
  }
};
