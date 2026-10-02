import { ALT_CATEGORY, ALT_TOP } from '../categories';
import { apiBase, getJson, httpError } from '../http';
import { Article, NewsProvider, ProviderError } from '../types';

const TOKEN = process.env.EXPO_PUBLIC_THENEWSAPI_TOKEN;
const BASE = `${apiBase('thenewsapi', 'https://api.thenewsapi.com')}/v1/news/top`;

type Raw = Record<string, any>;

export const thenewsapi: NewsProvider = {
  id: 'thenewsapi',
  name: 'The News API',
  isConfigured: () => !!TOKEN,
  async fetch({ country, categoryId, page, perPage, signal }) {
    const categories = categoryId ? ALT_CATEGORY[categoryId]?.thenewsapi : ALT_TOP.thenewsapi;
    if (!categories) throw new ProviderError('unsupported', 'Categoria não suportada pelo The News API.');

    // o plano grátis devolve poucos artigos por requisição; o servidor limita o `limit` ao permitido
    const params = new URLSearchParams({ api_token: TOKEN!, locale: country, categories, limit: String(perPage), page: String(page) });
    const { status, json, headers } = await getJson(`${BASE}?${params}`, { signal });
    if (status >= 400) throw httpError(status, json?.error?.message, headers);

    const list: Raw[] = json.data ?? [];
    const articles: Article[] = list
      .filter((a) => a.title && a.url)
      .map((a) => ({
        id: `thenewsapi:${a.uuid ?? a.url}`,
        title: a.title,
        description: a.description || a.snippet || undefined,
        image: a.image_url || undefined,
        url: a.url,
        sourceName: a.source,
        sourceDomain: a.source,
        language: a.language,
        categories: Array.isArray(a.categories) ? a.categories : [],
        publishedAt: a.published_at,
      }));
    const found = json.meta?.found ?? 0;
    const limit = json.meta?.limit ?? list.length;
    return { articles, hasMore: found > page * limit };
  },
};
