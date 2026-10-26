// 单词数据结构
export interface Word {
  id: string;
  word: string;
  phoneticUk: string;
  phoneticUs: string;
  meanings: Meaning[];
  examples?: Example[];
}

export interface Meaning {
  pos: string; // 词性，如 n. v. adj.
  def: string; // 中文释义
}

export interface Example {
  en: string;
  zh: string;
}

// SM-2 学习状态
export interface LearningState {
  wordId: string;
  n: number;        // 连续答对次数
  interval: number; // 复习间隔（天）
  ef: number;       // 难度系数
  nextReview: string; // 下次复习日期 ISO
  status: 'new' | 'learning' | 'mastered';
  reviewCount: number;
  lastReview?: string;
}

// 生词本条目
export interface NotebookItem {
  wordId: string;
  source: 'manual' | 'wrong'; // 手动收藏 / 答错收录
  addedAt: string;
  wrongCount?: number; // 累计答错次数
}

// 用户设置
export interface UserSettings {
  dailyGoal: number;       // 每日新学单词数
  accent: 'us' | 'uk';     // 发音偏好
  reviewModes: ReviewMode[]; // 启用的复习形式
  selectedBookId: string;  // 当前选中的词书
}

export type ReviewMode = 'choice' | 'listen' | 'card';

// 作答质量映射
export type Quality = 0 | 3 | 5; // 不认识=0, 模糊=3, 认识=5

// 词书
export interface WordBook {
  id: string;
  name: string;
  description: string;
  wordIds: string[];
  builtIn?: boolean; // 是否内置词书
}

// 导入的词书（含单词数据）
export interface ImportedBook {
  id: string;
  name: string;
  description: string;
  words: Word[];
  importedAt: string;
}
