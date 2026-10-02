import { ALT_CATEGORY } from '../categories';
import { apiBase } from '../http';
import { Article, NewsProvider, ProviderError } from '../types';

// Rede de segurança sem chave e sem cota: feed RSS público do Google News.
// Traz título, fonte e data (sem imagem nem resumo).
const BASE = `${apiBase('googlenews', 'https://news.google.com')}/rss`;

// país -> idioma da edição do Google News (padrão: inglês)
const HL: Record<string, string> = {
  br: 'pt-BR', pt: 'pt-PT', us: 'en-US', gb: 'en-GB', ca: 'en-CA', au: 'en-AU', ie: 'en-IE', in: 'en-IN', nz: 'en-NZ', za: 'en-ZA', sg: 'en-SG',
  es: 'es', mx: 'es-419', ar: 'es-419', co: 'es-419', cl: 'es-419', pe: 'es-419', ve: 'es-419', uy: 'es-419', ec: 'es-419',
  fr: 'fr', be: 'fr', de: 'de', at: 'de', ch: 'de', it: 'it', nl: 'nl', se: 'sv', no: 'no', dk: 'da', fi: 'fi', pl: 'pl', cz: 'cs',
  ru: 'ru', ua: 'uk', tr: 'tr', gr: 'el', jp: 'ja', kr: 'ko', cn: 'zh-CN', tw: 'zh-TW', hk: 'zh-HK', th: 'th', vn: 'vi', id: 'id', il: 'he',
};

const FEED_TTL = 5 * 60_000;
const feeds = new Map<string, { at: number; articles: Article[] }>();

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : undefined;
};

function parse(xml: string, lang: string): Article[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: Article[] = [];
  for (const it of items) {
    const rawTitle = tag(it, 'title');
    const link = tag(it, 'link');
    if (!rawTitle || !link) continue;
    const src = it.match(/<source url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/);
    const sourceName = src ? decode(src[2]).trim() : undefined;
    // o título vem como "Manchete - Fonte"
    const title = sourceName && rawTitle.endsWith(` - ${sourceName}`) ? rawTitle.slice(0, -(sourceName.length + 3)) : rawTitle;
    let sourceDomain: string | undefined;
    try { sourceDomain = src ? new URL(src[1]).hostname.replace(/^www\./, '') : undefined; } catch { /* ignora */ }
    const pub = tag(it, 'pubDate');
    out.push({
      id: `googlenews:${tag(it, 'guid') ?? link}`,
      title,
      url: link,
      sourceName,
      sourceDomain,
      language: lang.split('-')[0],
      categories: [],
      publishedAt: pub ? new Date(pub).toISOString() : undefined,
    });
  }
  return out;
}

export const googlenews: NewsProvider = {
  id: 'googlenews',
  name: 'Google News',
  isConfigured: () => true,
  async fetch({ country, categoryId, page, perPage, signal }) {
    let path = '';
    if (categoryId) {
      const topic = ALT_CATEGORY[categoryId]?.googlenews;
      if (!topic) throw new ProviderError('unsupported', 'Categoria não suportada pelo Google News.');
      path = `/headlines/section/topic/${topic}`;
    }
    const hl = HL[country] ?? 'en';
    const lang = hl.split('-')[0];
    const ceidLang = hl === 'pt-BR' ? 'pt-419' : hl === 'pt-PT' ? 'pt-150' : hl.startsWith('es-419') ? 'es-419' : lang;
    const params = `hl=${hl}&gl=${country.toUpperCase()}&ceid=${country.toUpperCase()}:${ceidLang}`;
    const url = `${BASE}${path}?${params}`;

    let entry = feeds.get(url);
    if (!entry || Date.now() - entry.at > FEED_TTL) {
      let res: Response;
      try {
        res = await fetch(url, { signal });
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
        throw new ProviderError('network', 'Sem conexão com o Google News.', 30_000);
      }
      if (!res.ok) throw new ProviderError(res.status === 429 ? 'rate' : 'other', `Google News: erro ${res.status}`, 60_000);
      entry = { at: Date.now(), articles: parse(await res.text(), hl) };
      feeds.set(url, entry);
    }

    const start = (page - 1) * perPage;
    const articles = entry.articles.slice(start, start + perPage);
    return { articles, hasMore: start + perPage < entry.articles.length };
  },
};
