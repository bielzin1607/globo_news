import type { ProviderId } from './types';

/**
 * Categorias do app (IPTC, usadas pela APITube) -> categoria equivalente em cada provedor alternativo.
 * Se não há equivalente, o provedor é pulado para aquele filtro (para não mostrar notícias fora da categoria).
 */
export const ALT_CATEGORY: Record<string, Partial<Record<Exclude<ProviderId, 'apitube'>, string>>> = {
  'medtop:11000000': { gnews: 'nation', newsdata: 'politics', thenewsapi: 'politics', googlenews: 'NATION' }, // política
  'medtop:04000000': { gnews: 'business', newsdata: 'business', thenewsapi: 'business', googlenews: 'BUSINESS' }, // economia
  'medtop:13000000': { gnews: 'technology', newsdata: 'technology', thenewsapi: 'tech', googlenews: 'TECHNOLOGY' }, // ciência e tecnologia
  'medtop:15000000': { gnews: 'sports', newsdata: 'sports', thenewsapi: 'sports', googlenews: 'SPORTS' }, // esportes
  'medtop:07000000': { gnews: 'health', newsdata: 'health', thenewsapi: 'health', googlenews: 'HEALTH' }, // saúde
  'medtop:01000000': { gnews: 'entertainment', newsdata: 'entertainment', thenewsapi: 'entertainment', googlenews: 'ENTERTAINMENT' }, // arte e cultura
  'medtop:06000000': { newsdata: 'environment', googlenews: 'SCIENCE' }, // meio ambiente
  'medtop:02000000': { newsdata: 'crime' }, // crime e justiça
  'medtop:05000000': { newsdata: 'education' }, // educação
  'medtop:10000000': { newsdata: 'lifestyle' }, // estilo de vida
  // conflitos (16) e clima (17): sem equivalente nos provedores alternativos
};

/** Categoria "sem filtro" em cada provedor. */
export const ALT_TOP: Partial<Record<ProviderId, string>> = { gnews: 'general', newsdata: 'top', thenewsapi: 'general' };
