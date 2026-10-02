import type { Article } from '../services/news';

// Guarda os artigos já carregados para a tela de leitura abrir por id sem serializar na URL.
const store = new Map<string, Article>();
export const rememberArticles = (list: Article[]) => list.forEach((a) => store.set(a.id, a));
export const getArticle = (id: string) => store.get(id);
