import { useEffect, useState } from 'react';
import { translateText } from '../services/translate';

/** Traduz `text` quando `enabled`; devolve o original enquanto carrega ou se falhar. */
export function useTranslated(
  text: string | undefined,
  to: string,
  from: string | undefined,
  enabled: boolean,
  ready?: string // tradução já fornecida pela APITube: evita chamar o serviço
) {
  const [out, setOut] = useState<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setOut(undefined);
    if (!enabled || !text || ready) return;
    translateText(text, to, from || 'auto')
      .then((t) => alive && setOut(t))
      .catch(() => {});
    return () => { alive = false; };
  }, [text, to, from, enabled, ready]);
  return enabled ? ready || out || text : text;
}
