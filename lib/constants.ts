export const BRAZIL_HOLIDAYS_2026: Record<string, string> = {
  '01/01/2026': 'Confraternização Universal',
  '16/02/2026': 'Carnaval (Ponto Facultativo)',
  '17/02/2026': 'Carnaval (Ponto Facultativo)',
  '18/02/2026': 'Quarta-feira de Cinzas (Ponto Facultativo)',
  '03/04/2026': 'Sexta-feira Santa',
  '21/04/2026': 'Tiradentes',
  '01/05/2026': 'Dia do Trabalho',
  '04/06/2026': 'Corpus Christi (Ponto Facultativo)',
  '07/09/2026': 'Independência do Brasil',
  '12/10/2026': 'Nossa Senhora Aparecida',
  '02/11/2026': 'Finados',
  '15/11/2026': 'Proclamação da República',
  '20/11/2026': 'Dia da Consciência Negra',
  '25/12/2026': 'Natal'
};

export const HAIR_SERVICES = [
  { name: 'Alisamento Orgânico', price: 350 },
  { name: 'Progressiva Premium', price: 450 },
  { name: 'Selagem Térmica', price: 280 },
  { name: 'Botox Capilar', price: 220 },
  { name: 'Cronograma Capilar', price: 180 },
  { name: 'Corte Especialista', price: 150 },
  { name: 'Hidratação Profunda', price: 120 },
];

export const PAYMENT_METHODS = ['Dinheiro', 'Débito', 'Crédito', 'Pix'];

export const CLIENT_STATUS_OPTIONS = ['VIP', 'Regular', 'Novo', 'Inativo', 'Cliente antiga'] as const;

export const CLIENT_ORIGIN_OPTIONS = [
  'Instagram', 
  'Facebook', 
  'TikTok', 
  'Google', 
  'Indicação', 
  'Passando na rua', 
  'Cliente antiga', 
  'Vizinha'
] as const;
