import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { LearningState, NotebookItem, UserSettings, Quality, ImportedBook } from '../types';
import { createInitialState, updateState } from '../lib/sm2';
import {
  loadStates, saveStates,
  loadNotebook, saveNotebook,
  loadSettings, saveSettings,
  loadStats, saveStats,
  loadStreak, saveStreak,
  loadImportedBooks, saveImportedBooks,
  todayStr, yesterdayStr,
} from '../lib/storage';
import type { DailyStats } from '../lib/storage';

interface AppState {
  states: Record<string, LearningState>;
  notebook: NotebookItem[];
  settings: UserSettings;
  stats: DailyStats[];
  streak: { current: number; lastDate: string };
  importedBooks: ImportedBook[];
}

type Action =
  | { type: 'LEARN_WORD'; wordId: string; quality: Quality }
  | { type: 'REVIEW_WORD'; wordId: string; quality: Quality; correct: boolean }
  | { type: 'TOGGLE_NOTEBOOK'; wordId: string }
  | { type: 'ADD_TO_NOTEBOOK'; wordId: string; source: 'manual' | 'wrong' }
  | { type: 'REMOVE_FROM_NOTEBOOK'; wordId: string }
  | { type: 'CLEAR_NOTEBOOK' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<UserSettings> }
  | { type: 'IMPORT_BOOK'; book: ImportedBook }
  | { type: 'DELETE_IMPORTED_BOOK'; bookId: string }
  | { type: 'MARK_KNOWN_WORDS'; wordIds: string[] }
  | { type: 'RESET_BOOK_PROGRESS'; wordIds: string[] };

const initialState: AppState = {
  states: loadStates(),
  notebook: loadNotebook(),
  settings: loadSettings(),
  stats: loadStats(),
  streak: loadStreak(),
  importedBooks: loadImportedBooks(),
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LEARN_WORD':
    case 'REVIEW_WORD': {
      const { wordId, quality } = action;
      const current = state.states[wordId] || createInitialState(wordId);
      const newState = updateState(current, quality);
      const newStates = { ...state.states, [wordId]: newState };

      // 更新统计
      const today = todayStr();
      const stats = [...state.stats];
      const idx = stats.findIndex(s => s.date === today);
      if (idx >= 0) {
        if (action.type === 'LEARN_WORD') stats[idx].learned += 1;
        else stats[idx].reviewed += 1;
      } else {
        stats.push({
          date: today,
          learned: action.type === 'LEARN_WORD' ? 1 : 0,
          reviewed: action.type === 'REVIEW_WORD' ? 1 : 0,
        });
      }

      // 更新连续打卡
      let streak = { ...state.streak };
      if (streak.lastDate !== today) {
        if (streak.lastDate === yesterdayStr()) {
          streak.current += 1;
        } else {
          streak.current = 1;
        }
        streak.lastDate = today;
      }

      // 错题收录
      let notebook = state.notebook;
      if (action.type === 'REVIEW_WORD' && !action.correct) {
        const exists = notebook.find(n => n.wordId === wordId);
        if (!exists) {
          notebook = [...notebook, { wordId, source: 'wrong', addedAt: today }];
        }
      }

      return { ...state, states: newStates, stats, streak, notebook };
    }

    // 检测中标记为“认识”的词：直接置为已掌握，且不再进入复习队列
    case 'MARK_KNOWN_WORDS': {
      const newStates = { ...state.states };
      for (const wordId of action.wordIds) {
        newStates[wordId] = {
          wordId,
          n: 5,
          interval: 0,
          ef: 2.5,
          nextReview: '9999-12-31',
          status: 'mastered',
          reviewCount: 0,
        };
      }
      return { ...state, states: newStates };
    }

    // 重新开始本词书：清空该词书所有单词的学习状态
    case 'RESET_BOOK_PROGRESS': {
      const newStates = { ...state.states };
      for (const wordId of action.wordIds) {
        delete newStates[wordId];
      }
      return { ...state, states: newStates };
    }

    case 'TOGGLE_NOTEBOOK': {
      const exists = state.notebook.find(n => n.wordId === action.wordId);
      if (exists) {
        return { ...state, notebook: state.notebook.filter(n => n.wordId !== action.wordId) };
      }
      return { ...state, notebook: [...state.notebook, { wordId: action.wordId, source: 'manual', addedAt: todayStr() }] };
    }

    case 'ADD_TO_NOTEBOOK': {
      const exists = state.notebook.find(n => n.wordId === action.wordId);
      if (exists) {
        if (action.source !== 'wrong') return state;
        return {
          ...state,
          notebook: state.notebook.map(n =>
            n.wordId === action.wordId ? { ...n, wrongCount: (n.wrongCount ?? 0) + 1 } : n,
          ),
        };
      }
      return {
        ...state,
        notebook: [
          ...state.notebook,
          {
            wordId: action.wordId,
            source: action.source,
            addedAt: todayStr(),
            wrongCount: action.source === 'wrong' ? 1 : 0,
          },
        ],
      };
    }

    case 'CLEAR_NOTEBOOK': {
      return { ...state, notebook: [] };
    }

    case 'REMOVE_FROM_NOTEBOOK': {
      return { ...state, notebook: state.notebook.filter(n => n.wordId !== action.wordId) };
    }

    case 'UPDATE_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.settings } };
    }

    case 'IMPORT_BOOK': {
      return { ...state, importedBooks: [...state.importedBooks, action.book] };
    }

    case 'DELETE_IMPORTED_BOOK': {
      const book = state.importedBooks.find(b => b.id === action.bookId);
      // 如果删除的是当前选中的词书，切回默认
      let settings = state.settings;
      if (book && settings.selectedBookId === action.bookId) {
        settings = { ...settings, selectedBookId: 'cet4' };
      }
      return {
        ...state,
        importedBooks: state.importedBooks.filter(b => b.id !== action.bookId),
        settings,
      };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 持久化
  useEffect(() => { saveStates(state.states); }, [state.states]);
  useEffect(() => { saveNotebook(state.notebook); }, [state.notebook]);
  useEffect(() => { saveSettings(state.settings); }, [state.settings]);
  useEffect(() => { saveStats(state.stats); }, [state.stats]);
  useEffect(() => { saveStreak(state.streak); }, [state.streak]);
  useEffect(() => { saveImportedBooks(state.importedBooks); }, [state.importedBooks]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
