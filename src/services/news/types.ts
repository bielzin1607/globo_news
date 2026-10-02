export type ProviderId = 'apitube' | 'gnews' | 'newsdata' | 'thenewsapi' | 'googlenews';

export type Article = {
  /** único entre fontes (prefixado com o id do provedor) */
  id: string;
  title: string;
  description?: string;
  body?: string;
  image?: string;
  url: string;
  sourceName?: string;
  sourceDomain?: string;
  language?: string;
  categories: string[];
  publishedAt?: string;
  /** traduções que o provedor já devolve (ex.: APITube: { en: { title, description } }) */
  translations?: Record<string, { title?: string; description?: string; body?: string }>;
};

export type FetchOpts = {
  country: string; // ISO-2 minúsculo
  categoryId?: string | null; // id IPTC (medtop:...)
  page: number; // 1-based
  perPage: number;
  signal?: AbortSignal;
};

export type NewsPage = { articles: Article[]; hasMore: boolean };

export type ProviderErrorKind =
  | 'quota' // cota diária/mensal esgotada
  | 'rate' // limite por minuto
  | 'auth' // chave inválida/sem permissão
  | 'network'
  | 'unsupported' // país/categoria que o provedor não atende
  | 'other';

export class ProviderError extends Error {
  constructor(public kind: ProviderErrorKind, message: string, public retryAfterMs?: number) {
    super(message);
  }
}

export interface NewsProvider {
  id: ProviderId;
  name: string;
  /** tem chave/configuração para ser usado? */
  isConfigured(): boolean;
  fetch(opts: FetchOpts): Promise<NewsPage>;
}

/** Erro final mostrado ao usuário quando nenhuma fonte conseguiu responder. */
export class NewsError extends Error {
  constructor(public kind: 'no-key' | 'auth' | 'rate' | 'quota' | 'network' | 'other', message: string) {
    super(message);
  }
}
