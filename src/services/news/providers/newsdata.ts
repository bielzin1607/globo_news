import { ALT_CATEGORY, ALT_TOP } from '../categories';
import { apiBase, getJson, httpError } from '../http';
import { Article, NewsProvider, ProviderError } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY;
const BASE = `${apiBase('newsdata', 'https://newsdata.io')}/api/1/latest`;

type Raw = Record<string, any>;

// O NewsData pagina por token (`nextPage`), não por número: guarda o token de cada página já buscada.
const tokens = new Map<string, string>();
const tokenKey = (country: string, category: string, page: number) => `${country}|${category}|${page}`;

const PAID_ONLY = /only available in paid/i;

export const newsdata: NewsProvider = {
  id: 'newsdata',
  name: 'NewsData.io',
  isConfigured: () => !!API_KEY,
  async fetch({ country, categoryId, page, signal }) {
    const category = categoryId ? ALT_CATEGORY[categoryId]?.newsdata : ALT_TOP.newsdata;
    if (!category) throw new ProviderError('unsupported', 'Categoria não suportada pelo NewsData.');

    const params = new URLSearchParams({ apikey: API_KEY!, country, category });
    if (page > 1) {
      const t = tokens.get(tokenKey(country, category, page - 1));
      if (!t) return { articles: [], hasMore: false };
      params.set('page', t);
    }
    const { status, json, headers } = await getJson(`${BASE}?${params}`, { signal });
    if (status >= 400 || json?.status === 'error') {
      throw httpError(status >= 400 ? status : 400, json?.results?.message ?? json?.message, headers);
    }

    const list: Raw[] = json.results ?? [];
    const articles: Article[] = list
      .filter((a) => a.title && a.link)
      .map((a) => ({
        id: `newsdata:${a.article_id ?? a.link}`,
        title: a.title,
        description: a.description && !PAID_ONLY.test(a.description) ? a.description : undefined,
        body: a.content && !PAID_ONLY.test(a.content) ? a.content : undefined,
        image: a.image_url || undefined,
        url: a.link,
        sourceName: a.source_name ?? a.source_id,
        sourceDomain: a.source_url ? hostOf(a.source_url) : undefined,
        language: typeof a.language === 'string' ? isoLang(a.language) : undefined,
        categories: Array.isArray(a.category) ? a.category : [],
        // "2026-10-02 12:00:00" (UTC)
        publishedAt: a.pubDate ? new Date(String(a.pubDate).replace(' ', 'T') + 'Z').toISOString() : undefined,
      }));

    if (json.nextPage) tokens.set(tokenKey(country, category, page), json.nextPage);
    return { articles, hasMore: !!json.nextPage };
  },
};

const LANG: Record<string, string> = { portuguese: 'pt', english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it', russian: 'ru', japanese: 'ja', chinese: 'zh', arabic: 'ar' };
const isoLang = (name: string) => LANG[name.toLowerCase()];
function hostOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return undefined; }
}
