// Servidor mock da APITube para desenvolvimento: node scripts/mock-api.js
// Use com EXPO_PUBLIC_APITUBE_BASE_URL=http://localhost:8099 e EXPO_PUBLIC_APITUBE_API_KEY=mock
const http = require('http');
const cats = { 'medtop:15000000': 'Esportes', 'medtop:11000000': 'Política' };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }); return res.end(); }
  const u = new URL(req.url, 'http://x');
  // MOCK_MODE=quota simula cota diária esgotada da APITube
  if (process.env.MOCK_MODE === 'quota') {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ status: 'not_ok', errors: [{ status: 429, code: 'ER0001', message: 'Daily quota exhausted' }] }));
  }
  const country = u.searchParams.get('source.country.code');
  const cat = u.searchParams.get('category.id');
  const page = Number(u.searchParams.get('page') || 1);
  const articles = Array.from({ length: 8 }, (_, i) => ({
    id: `${country}-${cat}-${page}-${i}`,
    title: `[${country?.toUpperCase()}] Notícia de exemplo ${i + 1} ${cat ? '(' + cats[cat] + ')' : ''}`,
    description: 'Resumo curto da notícia de exemplo, com texto suficiente para ocupar algumas linhas no cartão da lista de notícias do aplicativo.',
    body: 'Primeiro parágrafo do corpo da notícia. Segundo trecho com mais detalhes. Terceira frase para testar a leitura em voz alta e a tradução do texto completo.',
    href: 'https://example.com/article/' + i,
    image: `https://picsum.photos/seed/${country}${i}${page}/800/450`,
    source: { name: 'Fonte Exemplo', domain: 'example.com', country: { code: country } },
    language: { code: 'en' },
    categories: [{ id: cat || 'medtop:11000000', name: cats[cat] || 'Política' }],
    published_at: new Date(Date.now() - i * 3600e3).toISOString(),
  }));
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
  res.end(JSON.stringify({ results: articles, has_next_pages: page < 3 }));
}).listen(8099, () => console.log('mock api on 8099'));
