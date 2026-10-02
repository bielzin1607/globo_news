import { chunkText } from '../utils/format';

export const LANGUAGES = [
  { code: 'pt', label: 'Português', tts: 'pt-BR' },
  { code: 'en', label: 'English', tts: 'en-US' },
  { code: 'es', label: 'Español', tts: 'es-ES' },
  { code: 'fr', label: 'Français', tts: 'fr-FR' },
  { code: 'de', label: 'Deutsch', tts: 'de-DE' },
  { code: 'it', label: 'Italiano', tts: 'it-IT' },
  { code: 'ja', label: '日本語', tts: 'ja-JP' },
  { code: 'zh', label: '中文', tts: 'zh-CN' },
  { code: 'ru', label: 'Русский', tts: 'ru-RU' },
  { code: 'ar', label: 'العربية', tts: 'ar-SA' },
];

export const ttsLocale = (code?: string) => LANGUAGES.find((l) => l.code === code)?.tts ?? code ?? 'en-US';

const cache = new Map<string, string>();

// Provedor padrão: endpoint público (não oficial) do Google Translate — bom para protótipo.
// Para produção, troque por Cloud Translation / DeepL atrás de um backend seu (a chave não deve ficar no app).
async function googleGtx(text: string, from: string, to: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from || 'auto'}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  const json = await res.json();
  return (json[0] as any[]).map((s) => s[0]).join('');
}

async function myMemory(text: string, from: string, to: string): Promise<string> {
  const f = !from || from === 'auto' ? 'en' : from;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${f}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const json = await res.json();
  return json.responseData?.translatedText ?? text;
}

async function translateChunk(text: string, from: string, to: string) {
  try {
    return await googleGtx(text, from, to);
  } catch {
    // MyMemory aceita no máximo ~500 bytes por consulta
    const target = to === 'pt' ? 'pt-BR' : to;
    const parts = chunkText(text, 400);
    return (await Promise.all(parts.map((p) => myMemory(p, from, target)))).join(' ');
  }
}

export async function translateText(text: string | undefined, to: string, from = 'auto'): Promise<string> {
  if (!text?.trim()) return text ?? '';
  if (from === to) return text;
  const key = `${from}|${to}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const parts = chunkText(text, 1500);
  const out = await Promise.all(parts.map((p) => translateChunk(p, from, to)));
  const result = out.join(' ');
  cache.set(key, result);
  return result;
}

/** URL do Google Translate "web proxy" (translate.goog) para traduzir a própria página no navegador interno. */
export function translatedPageUrl(href: string, to: string) {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog';
    const q = new URLSearchParams(u.search);
    q.set('_x_tr_sl', 'auto');
    q.set('_x_tr_tl', to);
    q.set('_x_tr_hl', to);
    return `${u.protocol}//${host}${u.pathname}?${q}`;
  } catch {
    return href;
  }
}
