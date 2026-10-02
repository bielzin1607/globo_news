const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');
require('dotenv').config();

const config = getDefaultConfig(__dirname);

// As APIs de notícias não enviam headers CORS utilizáveis, então o navegador (web) não consegue chamá-las direto.
// No `expo start --web`, requisições para /proxy/<nome>/* são repassadas ao host real por este proxy.
// Só vale para desenvolvimento; em produção web use um proxy próprio (ex.: Cloudflare Worker).
const UPSTREAMS = {
  apitube: { host: 'api.apitube.io', headers: () => ({ 'X-API-Key': process.env.EXPO_PUBLIC_APITUBE_API_KEY || '' }) },
  gnews: { host: 'gnews.io' },
  newsdata: { host: 'newsdata.io' },
  thenewsapi: { host: 'api.thenewsapi.com' },
  googlenews: { host: 'news.google.com', headers: () => ({ 'User-Agent': 'Mozilla/5.0 (compatible; GloboNews/1.0)' }) },
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    const m = req.url.match(/^\/proxy\/([a-z]+)(\/.*)$/);
    const up = m && UPSTREAMS[m[1]];
    if (!up) return middleware(req, res, next);

    const upstream = https.request(
      {
        host: up.host,
        path: m[2],
        method: 'GET',
        headers: { Accept: '*/*', ...(up.headers ? up.headers() : {}) },
      },
      (r) => {
        res.writeHead(r.statusCode || 502, {
          'Content-Type': r.headers['content-type'] || 'application/json',
          ...(r.headers['retry-after'] ? { 'Retry-After': r.headers['retry-after'] } : {}),
        });
        r.pipe(res);
      }
    );
    upstream.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'proxy_error' }));
    });
    upstream.end();
  },
};

module.exports = config;
