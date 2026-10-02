import { Platform } from 'react-native';
import { apiBase, getJson, httpError } from '../http';
import { Article, NewsProvider, ProviderError } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_APITUBE_API_KEY;
// EXPO_PUBLIC_APITUBE_BASE_URL permite apontar para um servidor mock em desenvolvimento.
const BASE_URL =
  process.env.EXPO_PUBLIC_APITUBE_BASE_URL ?? `${apiBase('apitube', 'https://api.apitube.io')}/v1/news/everything`;
const IS_WEB = Platform.OS === 'web';

type Raw = Record<string, any>;

// `image` às vezes vem vazio mesmo com has_image=1; nesse caso usa a primeira imagem útil de `media`
// (ignora gifs/ícones/pixels de rastreio).
function pickImage(a: Raw): string | undefined {
  if (a.image) return a.image;
  const m = (a.media ?? []).find(
    (x: Raw) => x.type === 'image' && x.url && !/\.(gif|svg|ico)(\?|$)/i.test(x.url) && !/pixel|logo|favicon|avatar/i.test(x.url)
  );
  return m?.url;
}

function normalize(a: Raw): Article {
  const url = a.href ?? a.url ?? '';
  return {
    id: String(a.id ?? url),
    title: a.title ?? '',
    description: a.description || undefined,
    body: a.body || undefined,
    image: pickImage(a),
    url,
    sourceName: a.source?.name ?? a.source?.domain,
    sourceDomain: a.source?.domain,
    language: a.language?.code,
    categories: (a.categories ?? []).map((c: Raw) => c.name).filter(Boolean),
    publishedAt: a.published_at,
    translations: a.translations && typeof a.translations === 'object' ? a.translations : undefined,
  };
}

export const apitube: NewsProvider = {
  id: 'apitube',
  name: 'APITube',
  isConfigured: () => !!API_KEY,
  async fetch({ country, categoryId, page, perPage, signal }) {
    const params = new URLSearchParams({
      'source.country.code': country,
      has_image: '1',
      is_duplicate: '0',
      'sort.by': 'published_at',
      'sort.order': 'desc',
      per_page: String(perPage),
      page: String(page),
    });
    if (categoryId) params.set('category.id', categoryId);

    const { status, json, headers } = await getJson(`${BASE_URL}?${params}`, {
      // na web o proxy injeta a chave
      headers: IS_WEB ? undefined : { 'X-API-Key': API_KEY!, Accept: 'application/json' },
      signal,
    });
    if (status >= 400) throw httpError(status, json?.errors?.[0]?.message && `APITube: ${json.errors[0].message}`, headers);
    if (json?.status === 'not_ok') throw new ProviderError('other', json?.errors?.[0]?.message ?? 'Erro na APITube.');

    // A documentação mostra tanto `results` quanto `articles`; aceita ambos.
    const list: Raw[] = json.results ?? json.articles ?? [];
    const articles = list.map(normalize).filter((a) => a.title && a.url);
    const hasMore = json.has_next_pages ?? (json.meta?.pages ? json.meta.page < json.meta.pages : list.length >= perPage);
    return { articles, hasMore: Boolean(hasMore) };
  },
};
