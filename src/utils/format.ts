export function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Quebra texto em pedaços <= max caracteres, preferindo limites de frase. */
export function chunkText(text: string, max: number): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?。]+[.!?。]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (s.length > max) {
      if (cur) { chunks.push(cur); cur = ''; }
      for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
    } else if ((cur + s).length > max) {
      chunks.push(cur);
      cur = s;
    } else cur += s;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks.map((c) => c.trim()).filter(Boolean);
}
