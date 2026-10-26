import type { LearningState, NotebookItem, UserSettings, ImportedBook } from '../types';

const KEYS = {
  states: 'ela_learning_states',
  notebook: 'ela_notebook',
  settings: 'ela_settings',
  stats: 'ela_stats',
  streak: 'ela_streak',
  importedBooks: 'ela_imported_books',
};

// ===== 本地多用户 =====
export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

const PROFILE_LIST_KEY = 'ela_profiles';
const CURRENT_PROFILE_KEY = 'ela_current_profile';

function scoped(base: string, profileId: string) {
  return `${base}__${profileId}`;
}

// 首次运行：创建默认用户，并把旧版本数据迁移到该用户名下
export function listProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILE_LIST_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {
    // 忽略损坏数据，重建默认用户
  }
  const profile: Profile = {
    id: 'u' + Date.now().toString(36),
    name: '我',
    createdAt: todayStr(),
  };
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify([profile]));
  localStorage.setItem(CURRENT_PROFILE_KEY, profile.id);
  for (const base of Object.values(KEYS)) {
    const legacy = localStorage.getItem(base);
    if (legacy !== null) {
      localStorage.setItem(scoped(base, profile.id), legacy);
      localStorage.removeItem(base);
    }
  }
  return [profile];
}

export function currentProfileId(): string {
  const list = listProfiles();
  const id = localStorage.getItem(CURRENT_PROFILE_KEY);
  return list.some(p => p.id === id) ? (id as string) : list[0].id;
}

export function getCurrentProfile(): Profile {
  return listProfiles().find(p => p.id === currentProfileId()) ?? listProfiles()[0];
}

export function createProfile(name: string): Profile {
  const profile: Profile = {
    id: 'u' + Date.now().toString(36),
    name: name.trim() || '新用户',
    createdAt: todayStr(),
  };
  const list = [...listProfiles(), profile];
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
  return profile;
}

export function switchProfile(id: string) {
  localStorage.setItem(CURRENT_PROFILE_KEY, id);
}

export function deleteProfile(id: string): boolean {
  const current = currentProfileId();
  const list = listProfiles().filter(p => p.id !== id);
  if (list.length === 0) return false;
  for (const base of Object.values(KEYS)) {
    localStorage.removeItem(scoped(base, id));
  }
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
  if (current === id) {
    localStorage.setItem(CURRENT_PROFILE_KEY, list[0].id);
  }
  return true;
}

function key(base: string) {
  return scoped(base, currentProfileId());
}

export function loadStates(): Record<string, LearningState> {
  try {
    const raw = localStorage.getItem(key(KEYS.states));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStates(states: Record<string, LearningState>) {
  localStorage.setItem(key(KEYS.states), JSON.stringify(states));
}

export function loadNotebook(): NotebookItem[] {
  try {
    const raw = localStorage.getItem(key(KEYS.notebook));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotebook(items: NotebookItem[]) {
  localStorage.setItem(key(KEYS.notebook), JSON.stringify(items));
}

const defaultSettings: UserSettings = {
  dailyGoal: 20,
  accent: 'us',
  reviewModes: ['choice', 'listen', 'card'],
  selectedBookId: 'cet4',
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(key(KEYS.settings));
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: UserSettings) {
  localStorage.setItem(key(KEYS.settings), JSON.stringify(settings));
}

// 每日学习统计
export interface DailyStats {
  date: string;
  learned: number;
  reviewed: number;
}

export function loadStats(): DailyStats[] {
  try {
    const raw = localStorage.getItem(key(KEYS.stats));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStats(stats: DailyStats[]) {
  localStorage.setItem(key(KEYS.stats), JSON.stringify(stats));
}

export interface StreakData {
  current: number;
  lastDate: string;
}

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(key(KEYS.streak));
    return raw ? JSON.parse(raw) : { current: 0, lastDate: '' };
  } catch {
    return { current: 0, lastDate: '' };
  }
}

export function saveStreak(streak: StreakData) {
  localStorage.setItem(key(KEYS.streak), JSON.stringify(streak));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// 导入的词书
export function loadImportedBooks(): ImportedBook[] {
  try {
    const raw = localStorage.getItem(key(KEYS.importedBooks));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImportedBooks(books: ImportedBook[]) {
  localStorage.setItem(key(KEYS.importedBooks), JSON.stringify(books));
}
