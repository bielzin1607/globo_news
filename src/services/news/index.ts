import AsyncStorage from '@react-native-async-storage/async-storage';
import { apitube } from './providers/apitube';
import { gnews } from './providers/gnews';
import { googlenews } from './providers/googlenews';
import { newsdata } from './providers/newsdata';
import { thenewsapi } from './providers/thenewsapi';
import { FetchOpts, NewsError, NewsPage, NewsProvider, ProviderError, ProviderId } from './types';

export * from './types';

const ALL: Record<ProviderId, NewsProvider> = { apitube, gnews, newsdata, thenewsapi, googlenews };

// Ordem de tentativa. Configurável: EXPO_PUBLIC_NEWS_PROVIDERS="apitube,gnews,newsdata,thenewsapi,googlenews"
const ORDER: ProviderId[] = (process.env.EXPO_PUBLIC_NEWS_PROVIDERS ?? 'apitube,gnews,newsdata,thenewsapi,googlenews')
  .split(',')
  .map((s: string) => s.trim() as ProviderId)
  .filter((id: ProviderId) => id in ALL);

// ---- provedores "em espera" (cota/limite/chave) ------------------------------------------------
const STORE_KEY = 'news:cooldowns:v1';
const cooldowns = new Map<ProviderId, number>(); // id -> timestamp (ms) em que volta a ser tentado

AsyncStorage.getItem(STORE_KEY)
  .then((v) => {
    if (!v) return;
    const now = Date.now();
    for (const [id, until] of Object.entries(JSON.parse(v) as Record<string, number>)) {
      if (until > now && !cooldowns.has(id as ProviderId)) cooldowns.set(id as ProviderId, until);
    }
  })
  .catch(() => {});

function persist() {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(cooldowns))).catch(() => {});
}

function coolDown(id: ProviderId, err: ProviderError) {
  const ms =
    err.kind === 'quota' ? err.retryAfterMs ?? 6 * 3600_000
    : err.kind === 'rate' ? err.retryAfterMs ?? 60_000
    : err.kind === 'auth' ? 12 * 3600_000
    : err.kind === 'network' ? err.retryAfterMs ?? 30_000
    : 0;
  if (!ms) return;
  cooldowns.set(id, Date.now() + ms);
  if (err.kind === 'quota' || err.kind === 'auth') persist();
  if (__DEV__) console.log(`[news] ${id} em espera (${err.kind}) por ${Math.round(ms / 1000)}s: ${err.message}`);
}

const isCooling = (id: ProviderId) => (cooldowns.get(id) ?? 0) > Date.now();

/** Estado das fontes, para telas de diagnóstico. */
export function providerStatus() {
  return ORDER.map((id) => ({
    id,
    name: ALL[id].name,
    configured: ALL[id].isConfigured(),
    coolingUntil: isCooling(id) ? cooldowns.get(id)! : null,
  }));
}

export type SourcedPage = NewsPage & { provider: ProviderId; providerName: string };

/**
 * Busca notícias percorrendo a cadeia de provedores. Quando um estoura a cota (ou falha),
 * fica em espera e o próximo assume automaticamente. `provider` fixa a fonte (usado na paginação,
 * já que as páginas de um provedor não existem no outro).
 */
export async function fetchNews(opts: Omit<FetchOpts, 'perPage'> & { perPage?: number; provider?: ProviderId }): Promise<SourcedPage> {
  const perPage = opts.perPage ?? (Number(process.env.EXPO_PUBLIC_NEWS_PER_PAGE) || 10);
  const chain = opts.provider ? [opts.provider] : ORDER;

  const failures: ProviderError[] = [];
  let sawConfigured = false;
  let emptyFrom: SourcedPage | null = null;

  for (const id of chain) {
    const p = ALL[id];
    if (!p.isConfigured()) continue;
    sawConfigured = true;
    if (!opts.provider && isCooling(id)) {
      failures.push(new ProviderError('quota', `${p.name} em espera`));
      continue;
    }
    try {
      const page = await p.fetch({ ...opts, perPage });
      // país/categoria sem resultado: tenta a próxima fonte (só na 1ª página)
      if (page.articles.length === 0 && opts.page === 1 && !opts.provider) {
        emptyFrom ??= { ...page, provider: id, providerName: p.name };
        continue;
      }
      return { ...page, provider: id, providerName: p.name };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      if (!(e instanceof ProviderError)) throw new NewsError('other', 'Não foi possível carregar as notícias.');
      coolDown(id, e);
      failures.push(e);
      if (opts.provider) break;
    }
  }

  if (emptyFrom) return emptyFrom;
  if (!sawConfigured) throw new NewsError('no-key', 'Nenhuma chave de API configurada.');

  // nenhuma fonte respondeu: escolhe a mensagem mais útil
  const kinds = failures.map((f) => f.kind);
  if (kinds.includes('quota') && kinds.every((k) => k === 'quota' || k === 'unsupported'))
    throw new NewsError('quota', 'As cotas gratuitas de hoje acabaram. Tente novamente mais tarde.');
  if (kinds.every((k) => k === 'unsupported')) throw new NewsError('other', 'Nenhuma fonte disponível atende a esse filtro.');
  if (kinds.every((k) => k === 'auth')) throw new NewsError('auth', failures[0].message);
  if (kinds.includes('network')) throw new NewsError('network', 'Sem conexão com o servidor de notícias.');
  throw new NewsError('other', failures.find((f) => f.kind !== 'unsupported')?.message ?? 'Não foi possível carregar as notícias.');
}
