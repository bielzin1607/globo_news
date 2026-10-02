import { ALT_CATEGORY, ALT_TOP } from '../categories';
import { apiBase, getJson, httpError } from '../http';
import { Article, NewsProvider, ProviderError } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GNEWS_API_KEY;
const BASE = `${apiBase('gnews', 'https://gnews.io')}/api/v4/top-headlines`;

// Países aceitos pelo top-headlines do GNews.
const COUNTRIES = new Set(
  'au br ca cn eg fr de gr hk in ie il it jp nl no pk pe ph pt ro ru sg es se ch tw ua gb us'.split(' ')
);

type Raw = Record<string, any>;

export const gnews: NewsProvider = {
  id: 'gnews',
  name: 'GNews',
  isConfigured: () => !!API_KEY,
  async fetch({ country, categoryId, page, perPage, signal }) {
    if (!COUNTRIES.has(country)) throw new ProviderError('unsupported', 'País não suportado pelo GNews.');
    const category = categoryId ? ALT_CATEGORY[categoryId]?.gnews : ALT_TOP.gnews;
    if (!category) throw new ProviderError('unsupported', 'Categoria não suportada pelo GNews.');

    const params = new URLSearchParams({ country, category, max: String(Math.min(perPage, 10)), page: String(page), apikey: API_KEY! });
    const { status, json, headers } = await getJson(`${BASE}?${params}`, { signal });
    if (status >= 400) throw httpError(status, Array.isArray(json?.errors) ? json.errors.join(' ') : json?.errors?.[0], headers);

    const list: Raw[] = json.articles ?? [];
    const articles: Article[] = list
      .filter((a) => a.title && a.url)
      .map((a) => ({
        id: `gnews:${a.id ?? a.url}`,
        title: a.title,
        description: a.description || undefined,
        // `content` do GNews vem truncado ("... [1234 chars]"): só serve como prévia
        body: a.content ? String(a.content).replace(/\s*\[\d+ chars\]\s*$/, '…') : undefined,
        image: a.image || undefined,
        url: a.url,
        sourceName: a.source?.name,
        sourceDomain: a.source?.url ? safeHost(a.source.url) : undefined,
        categories: [],
        publishedAt: a.publishedAt,
      }));
    return { articles, hasMore: list.length >= Math.min(perPage, 10) };
  },
};

function safeHost(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return undefined; }
}
