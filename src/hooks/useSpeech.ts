import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chunkText } from '../utils/format';

/** Leitura em voz alta de textos longos, em fila de trechos (limite de tamanho por utterance do Android). */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    Speech.stop();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, language: string) => {
    const chunks = chunkText(text, 1800);
    if (!chunks.length) return;
    const id = ++run.current;
    Speech.stop();
    setSpeaking(true);
    const next = (i: number) => {
      if (id !== run.current) return;
      if (i >= chunks.length) { setSpeaking(false); return; }
      Speech.speak(chunks[i], {
        language,
        onDone: () => next(i + 1),
        onError: () => { if (id === run.current) setSpeaking(false); },
      });
    };
    next(0);
  }, []);

  useEffect(() => () => { run.current++; Speech.stop(); }, []);

  return { speaking, speak, stop };
}
