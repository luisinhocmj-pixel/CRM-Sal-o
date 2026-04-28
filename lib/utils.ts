import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getAvatarUrl = (seed: string | undefined | null) => {
  const name = seed || 'default';
  
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

  // Parâmetros para Lorelei (8.x para estabilidade):
  // - beardProbability: 0 (sempre sem barba, mais feminino)
  // - eyebrows: Apenas estilos suaves
  // - eyes: hearth, happy, etc.
  // - mouth: happy, laughing, smile, twinkle
  const mouths = ['happy', 'laughing', 'smile', 'twinkle'].join(',');
  const eyes = ['happy', 'wink', 'wink2', 'closed', 'hearts'].join(',');
  
  // Adicionando um timestamp ou versão para forçar o recarregamento
  return `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=${colors[index]}&mouth=${mouths}&eyes=${eyes}&beardProbability=0&v=2`;
};
