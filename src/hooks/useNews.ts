import { useCallback, useEffect, useRef, useState } from 'react';
import { Article, fetchNews, NewsError, ProviderId } from '../services/news';
import { rememberArticles } from '../state/articleStore';

type Cached = { articles: Article[]; hasMore: boolean; page: number; provider: ProviderId; providerName: string };
const cache = new Map<string, Cached>();

export function useNews(country: string | null, categoryId: string | null) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<NewsError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState<{ id: ProviderId; name: string } | null>(null);
  const pageRef = useRef(1);
  const key = `${country}|${categoryId}`;
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (force = false) => {
      abortRef.current?.abort();
      if (!country) { setArticles([]); return; }
      const cached = cache.get(key);
      if (cached && !force) {
        setArticles(cached.articles); setHasMore(cached.hasMore); pageRef.current = cached.page; setSource({ id: cached.provider, name: cached.providerName }); setError(null); setLoading(false);
        return;
      }
      const ctl = new AbortController();
      abortRef.current = ctl;
      setLoading(true); setError(null); setArticles([]); setSource(null);
      try {
        const r = await fetchNews({ country, categoryId, page: 1, signal: ctl.signal });
        rememberArticles(r.articles);
        cache.set(key, { articles: r.articles, hasMore: r.hasMore, page: 1, provider: r.provider, providerName: r.providerName });
        setArticles(r.articles); setHasMore(r.hasMore); pageRef.current = 1; setSource({ id: r.provider, name: r.providerName });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e instanceof NewsError ? e : new NewsError('other', 'Não foi possível carregar as notícias.'));
      } finally {
        if (abortRef.current === ctl) setLoading(false);
      }
    },
    [country, categoryId, key]
  );

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, [load]);

  const loadMore = useCallback(async () => {
    if (!country || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = pageRef.current + 1;
      // a paginação continua na mesma fonte da 1ª página
      const r = await fetchNews({ country, categoryId, page, provider: source?.id });
      rememberArticles(r.articles);
      setArticles((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const merged = [...prev, ...r.articles.filter((a) => !seen.has(a.id))];
        cache.set(key, { articles: merged, hasMore: r.hasMore, page, provider: r.provider, providerName: r.providerName });
        return merged;
      });
      setHasMore(r.hasMore); pageRef.current = page;
    } catch { /* mantém lista atual */ } finally { setLoadingMore(false); }
  }, [country, categoryId, key, loading, loadingMore, hasMore, source]);

  return { articles, loading, loadingMore, error, hasMore, source, loadMore, refresh: () => load(true) };
}
