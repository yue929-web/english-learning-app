import type { Word, WordBook, ImportedBook } from '../types';
import cetData from './cet-words.json';

// 真实词库：每本书各自独立的词条与释义（同一单词在不同词书中义项可以不同）
const cet4Words: Word[] = (cetData as any).cet4 as Word[];
const cet6Words: Word[] = (cetData as any).cet6 as Word[];
const kaoyanWords: Word[] = (cetData as any).kaoyan as Word[];
const ieltsWords: Word[] = (cetData as any).ielts as Word[];
const greWords: Word[] = (cetData as any).gre as Word[];

// 词书源数据大多按字母序排列，直接学会出现连续 A 开头；用固定种子洗牌打散，
// 固定种子保证每次启动顺序一致（学习进度按词书内位置推进，顺序不能每次变）
function shuffleWords(list: Word[], seed: number): Word[] {
  const out = [...list];
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const cet4Order = shuffleWords(cet4Words, 4001);
const cet6Order = shuffleWords(cet6Words, 6001);
const kaoyanOrder = shuffleWords(kaoyanWords, 7001);
const ieltsOrder = shuffleWords(ieltsWords, 8001);
const greOrder = shuffleWords(greWords, 9001);

// 词书定义：按难度/考试分类
export const wordBooks: WordBook[] = [
  {
    id: 'cet4',
    name: '四级词汇',
    description: `大学英语四级 · ${cet4Words.length} 词`,
    wordIds: cet4Order.map(w => w.id),
    builtIn: true,
  },
  {
    id: 'cet6',
    name: '六级词汇',
    description: `大学英语六级 · ${cet6Words.length} 词`,
    wordIds: cet6Order.map(w => w.id),
    builtIn: true,
  },
  {
    id: 'kaoyan',
    name: '考研词汇',
    description: `考研英语词汇 · ${kaoyanWords.length} 词`,
    wordIds: kaoyanOrder.map(w => w.id),
    builtIn: true,
  },
  {
    id: 'ielts',
    name: '雅思词汇',
    description: `IELTS 词汇 · ${ieltsWords.length} 词`,
    wordIds: ieltsOrder.map(w => w.id),
    builtIn: true,
  },
  {
    id: 'advanced',
    name: 'GRE 词汇',
    description: `GRE 词汇 · ${greWords.length} 词`,
    wordIds: greOrder.map(w => w.id),
    builtIn: true,
  },
];

// 内置词的 wordMap（五本词书各自的真实词条）
export const wordMap: Record<string, Word> = Object.fromEntries(
  [...cet4Words, ...cet6Words, ...kaoyanWords, ...ieltsWords, ...greWords].map(w => [w.id, w])
);

// 获取默认词书
export function getDefaultBook(): WordBook {
  return wordBooks[0];
}

// 获取所有词书（内置 + 导入）
export function getAllBooks(importedBooks: ImportedBook[] = []): WordBook[] {
  const imported: WordBook[] = importedBooks.map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    wordIds: b.words.map(w => w.id),
    builtIn: false,
  }));
  return [...wordBooks, ...imported];
}

// 获取合并后的 wordMap（内置 + 导入）
export function getCombinedWordMap(importedBooks: ImportedBook[] = []): Record<string, Word> {
  const map: Record<string, Word> = { ...wordMap };
  for (const book of importedBooks) {
    for (const w of book.words) {
      map[w.id] = w;
    }
  }
  return map;
}

// 根据 id 获取词书（内置 + 导入）
export function getBookById(id: string, importedBooks: ImportedBook[] = []): WordBook | undefined {
  const all = getAllBooks(importedBooks);
  return all.find(b => b.id === id);
}
