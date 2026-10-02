import { Platform } from 'react-native';
import { ProviderError } from './types';

/**
 * Na web o navegador bloqueia essas APIs por CORS, então as chamadas passam pelo proxy do Metro
 * (/proxy/<nome>, ver metro.config.js). No nativo não há CORS: chamada direta.
 */
export const apiBase = (name: string, nativeBase: string) => (Platform.OS === 'web' ? `/proxy/${name}` : nativeBase);

export async function getJson(url: string, init?: RequestInit): Promise<{ status: number; json: any; headers: Headers }> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ProviderError('network', 'Sem conexão com o servidor de notícias.', 30_000);
  }
  const json = await res.json().catch(() => undefined);
  return { status: res.status, json, headers: res.headers };
}

/** Milissegundos até 00:00 UTC (cotas diárias costumam zerar aí). */
export function msUntilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

/** Classifica respostas HTTP de erro comuns entre as APIs. */
export function httpError(status: number, message: string | undefined, headers?: Headers): ProviderError {
  const text = (message ?? '').toLowerCase();
  const retryAfter = Number(headers?.get('retry-after'));
  const daily = /day|daily|credit|quota|exhaust|limit for today|usage/.test(text);
  if (status === 401) return new ProviderError('auth', message || 'Chave inválida.');
  if (status === 402 || (status === 403 && daily)) return new ProviderError('quota', message || 'Cota esgotada.', msUntilUtcMidnight());
  if (status === 403) return new ProviderError('auth', message || 'Sem permissão.');
  if (status === 429) {
    return daily
      ? new ProviderError('quota', message || 'Cota esgotada.', msUntilUtcMidnight())
      : new ProviderError('rate', message || 'Muitas requisições.', retryAfter > 0 ? retryAfter * 1000 : 60_000);
  }
  if (status === 400 || status === 422) return new ProviderError('unsupported', message || 'Parâmetros não suportados.');
  return new ProviderError('other', message ? message : `Erro ${status} ao buscar notícias.`);
}
