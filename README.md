# Globo News

App de notícias (Expo + React Native, iOS/Android/Web) cuja tela principal é um globo 3D.
Toque em um país → últimas notícias (APITube) com imagem + resumo → toque na notícia para abrir no navegador interno.

## Rodando

1. Coloque sua chave em `.env` (`EXPO_PUBLIC_APITUBE_API_KEY=...`).
2. `npm install` · `npx expo start` (web: `npm run web`).
3. **expo-gl não roda no Expo Go em todos os casos / simulador iOS é instável** — teste em aparelho real.

Sem chave, use o mock: `node scripts/mock-api.js` e no `.env` defina
`EXPO_PUBLIC_APITUBE_API_KEY=mock` e `EXPO_PUBLIC_APITUBE_BASE_URL=http://localhost:8099`.

## Estrutura

- `src/components/globe/` — globo (three + @react-three/fiber). Arrastar gira (com inércia), pinça dá zoom, toque faz raycast → lat/lon.
- `src/utils/geo.ts` — lat/lon ↔ esfera e point-in-polygon para descobrir o país tocado.
- `src/data/countries.json` e `assets/globe/earth.jpg` — **gerados** por `npm run build:globe` (Natural Earth via `world-atlas`). Para mais realismo, troque `earth.jpg` por uma textura de satélite equirretangular (ex.: NASA Blue Marble) — o mapeamento é o padrão.
- `src/services/news/` — **cadeia de fontes com failover** (ver abaixo). `providers/` tem um arquivo por API.
- `src/services/translate.ts` — tradução (Google gtx não oficial → fallback MyMemory). Trocar por DeepL/Cloud Translation via backend em produção.
- `src/app/article.tsx` — navegador interno (WebView / iframe na web), modo Texto, tradução e leitura em voz alta (`expo-speech`).

## Pendências / limites conhecidos

- A chave `EXPO_PUBLIC_*` fica embutida no app: para produção, use um backend/proxy.
- Campos da resposta da APITube variam na documentação (`results` vs `articles`); o parser aceita ambos. Confirme com sua chave real, inclusive se `body` vem na listagem do seu plano.
- Territórios sem código ISO no mapa (ex.: Kosovo) mostram "sem fonte de notícias".

## Fontes de notícias e failover

Ordem padrão: **APITube → GNews → NewsData.io → The News API → Google News (RSS)**. Cada fonte só entra na cadeia se tiver chave no `.env` (o Google News não precisa de chave).

- Se uma fonte devolve cota esgotada (402/429/403 com mensagem de cota), ela fica **em espera** até 00:00 UTC (limite por minuto: ~60 s; chave inválida: 12 h) e a próxima assume. O estado de "cota esgotada" é salvo no aparelho.
- A lista mostra "via <fonte>" no painel. A paginação continua na fonte da 1ª página.
- Se a fonte não suporta o país/categoria (ou não retorna nada), tenta a próxima. Categorias sem equivalente (ex.: Conflitos, Clima) só existem na APITube.
- Para trocar a ordem: `EXPO_PUBLIC_NEWS_PROVIDERS=gnews,apitube,googlenews`.
- Teste de failover: `node scripts/mock-api.js` com `MOCK_MODE=quota` simula a APITube sem cota (veja `.claude/launch.json`).
- Na web, as chamadas passam por `/proxy/<nome>` no Metro (`metro.config.js`) por causa de CORS; só em desenvolvimento.

**Limites e termos (confirme nos painéis de cada serviço — mudam com o tempo):** os planos gratuitos costumam ter cota diária baixa, atraso nas notícias e uso apenas não comercial. O feed do Google News é "para uso pessoal e não comercial". Texto completo e imagens variam: Google News não traz imagem nem resumo.

## Gerando o APK (EAS Build)

Projeto EAS: `@bielzin1607/globo-news` · package `com.globonews.app` (config em `app.json` e `eas.json`).

```bash
npm run build:apk        # = eas build -p android --profile preview  (gera um .apk instalável)
```

- O `.env` **não** vai para o build (está no `.gitignore`). As chaves `EXPO_PUBLIC_*` estão cadastradas no EAS como variáveis *sensíveis* nos ambientes `preview` e `production`. Para alterar: `npx eas-cli env:set --name EXPO_PUBLIC_X --value ... --environment preview --visibility sensitive`; para listar: `npx eas-cli env:list preview`.
- As chaves ficam embutidas no APK (limitação de `EXPO_PUBLIC_*`): não distribua o APK publicamente enquanto não houver um proxy.
- O EAS empacota o repositório Git: faça commit das mudanças antes (ele também pergunta). Na primeira vez, aceite gerar o *keystore* (Y).
- O build usa a cota de builds gratuitos da conta. Ao terminar, o link do `.apk` aparece no terminal e em https://expo.dev/accounts/bielzin1607/projects/globo-news/builds
