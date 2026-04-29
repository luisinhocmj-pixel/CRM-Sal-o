import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getAvatarUrl = (seed: string | undefined | null) => {
  const name = (seed || 'default').trim();
  
  const colors = [
    'b6e3f4', // Azul claro
    'c0aede', // Lilás
    'd1d4f9', // Azul lavanda
    'ffd5dc', // Rosa claro
    'ffdfbf', // Creme/Pêssego
    'ffd3b6', // Salmão claro
    'a5d6a7', // Verde menta
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;

  // Parâmetros para Lorelei (v9):
  // - beardProbability: 0 (fundamental para garantir feminino)
  // - mouth: Apenas sorrisos e expressões felizes (removendo sad, serious, etc)
  // - eyes: Expressões amigáveis
  const mouths = ['happy', 'laughing', 'smile', 'twinkle'].join(',');
  const eyes = ['happy', 'wink', 'wink2', 'closed', 'hearts'].join(',');
  
  // Usamos v=10 para forçar o recarregamento e garantir v9 da API
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=${colors[index]}&mouth=${mouths}&eyes=${eyes}&beardProbability=0&v=10`;
};

export const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateBR = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    // Se a data vier no formato ISO ou YYYY-MM-DD
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};
