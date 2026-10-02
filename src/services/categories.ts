// Categorias IPTC Media Topics, usadas pela APITube em `category.id`.
export type Category = { id: string | null; label: string; emoji: string };

export const CATEGORIES: Category[] = [
  { id: null, label: 'Todas', emoji: '🌍' },
  { id: 'medtop:11000000', label: 'Política', emoji: '🏛️' },
  { id: 'medtop:04000000', label: 'Economia', emoji: '💼' },
  { id: 'medtop:13000000', label: 'Ciência e Tecnologia', emoji: '🔬' },
  { id: 'medtop:15000000', label: 'Esportes', emoji: '⚽' },
  { id: 'medtop:07000000', label: 'Saúde', emoji: '🩺' },
  { id: 'medtop:01000000', label: 'Arte e Cultura', emoji: '🎭' },
  { id: 'medtop:06000000', label: 'Meio Ambiente', emoji: '🌱' },
  { id: 'medtop:02000000', label: 'Crime e Justiça', emoji: '⚖️' },
  { id: 'medtop:16000000', label: 'Conflitos', emoji: '🛡️' },
  { id: 'medtop:05000000', label: 'Educação', emoji: '🎓' },
  { id: 'medtop:10000000', label: 'Estilo de Vida', emoji: '✨' },
  { id: 'medtop:17000000', label: 'Clima', emoji: '⛅' },
];
