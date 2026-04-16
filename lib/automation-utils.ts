import { Client } from './supabase-service';
import { parse, isBefore, differenceInDays } from 'date-fns';

export const getTopSpenders = (clients: Client[], limit = 5) => {
  return [...clients]
    .sort((a, b) => {
      const valA = parseFloat(a.total?.replace('R$ ', '').replace('.', '').replace(',', '.') || '0');
      const valB = parseFloat(b.total?.replace('R$ ', '').replace('.', '').replace(',', '.') || '0');
      return valB - valA;
    })
    .slice(0, limit);
};

export const getTopReferrers = (clients: Client[], limit = 5) => {
  const counts: Record<string, number> = {};
  clients.forEach(c => {
    if (c.referredBy) {
      const referrer = String(c.referredBy).trim();
      if (referrer) {
        counts[referrer] = (counts[referrer] || 0) + 1;
      }
    }
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const getOriginStats = (clients: Client[]) => {
  const stats: Record<string, number> = {};
  clients.forEach(c => {
    const origin = c.origin || 'Não informada';
    stats[origin] = (stats[origin] || 0) + 1;
  });
  return stats;
};

export const getClientStatusMetrics = (clients: Client[]) => {
  const now = new Date();
  const overdue: Client[] = [];
  const inactive: Client[] = [];
  const upcoming: Client[] = [];

  clients.forEach(client => {
    if (client.nextVisit) {
      try {
        const nextDate = parse(client.nextVisit, 'yyyy-MM-dd', new Date());
        if (isBefore(nextDate, now) && differenceInDays(now, nextDate) > 0) {
          overdue.push(client);
        } else if (differenceInDays(nextDate, now) <= 7) {
          upcoming.push(client);
        }
      } catch {
        // Fallback for other formats if any
      }
    }

    if (client.lastVisit) {
      try {
        const lastDate = parse(client.lastVisit, 'yyyy-MM-dd', new Date());
        if (differenceInDays(now, lastDate) > 60) {
          inactive.push(client);
        }
      } catch {}
    }
  });

  return { overdue, inactive, upcoming };
};

export const generateWhatsAppMessage = (client: Client, type: 'reminder' | 'overdue' | 'inactive') => {
  const firstName = client.name.split(' ')[0];
  let message = '';

  if (type === 'reminder') {
    message = `Olá ${firstName}! Tudo bem? Aqui é a Fernanda do Luxe Beauty. Passando para lembrar que seu retorno está chegando (${client.nextVisit}). Vamos confirmar seu horário? ✨`;
  } else if (type === 'overdue') {
    message = `Oi ${firstName}! Notei que sua data de retorno prevista (${client.nextVisit}) já passou. Gostaria de agendar um novo horário para mantermos seu cabelo impecável? 💖`;
  } else if (type === 'inactive') {
    message = `Oi ${firstName}, quanto tempo! Saudades de você aqui no Luxe Beauty. Que tal um momento de autocuidado esta semana? Tenho horários disponíveis! 🌸`;
  }

  const phone = client.phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/55${phone}?text=${encodedMessage}`;
};
