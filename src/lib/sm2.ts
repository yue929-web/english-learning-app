import type { LearningState, Quality } from '../types';

const DEFAULT_EF = 2.5;
const MIN_EF = 1.3;

/**
 * 创建一个新单词的初始学习状态
 */
export function createInitialState(wordId: string): LearningState {
  return {
    wordId,
    n: 0,
    interval: 0,
    ef: DEFAULT_EF,
    nextReview: new Date().toISOString().slice(0, 10),
    status: 'new',
    reviewCount: 0,
  };
}

/**
 * SM-2 算法核心：根据作答质量更新学习状态
 * @param state 当前学习状态
 * @param q 作答质量（0=不认识, 3=模糊, 5=认识）
 * @returns 更新后的学习状态
 */
export function updateState(state: LearningState, q: Quality): LearningState {
  const today = new Date().toISOString().slice(0, 10);

  // 步骤 1：更新 EF
  let ef = state.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < MIN_EF) ef = MIN_EF;
  ef = Math.round(ef * 100) / 100;

  // 步骤 2：更新 n 和 interval
  let n: number;
  let interval: number;

  if (q < 3) {
    // 不认识或模糊：重置，明天复习
    n = 0;
    interval = 1;
  } else {
    // 认识：连续答对次数 +1
    n = state.n + 1;
    if (n === 1) {
      interval = 1;
    } else if (n === 2) {
      interval = 6;
    } else {
      interval = Math.round(state.interval * ef);
    }
  }

  // 步骤 3：计算下次复习日期
  const nextDate = addDays(today, interval);

  // 判断状态
  let status: LearningState['status'];
  if (n >= 5) {
    status = 'mastered';
  } else if (n > 0 || state.status === 'learning') {
    status = 'learning';
  } else {
    status = 'new';
  }
  // 只要有过作答就不再是 new
  if (state.reviewCount > 0 || n >= 0) {
    if (status === 'new') status = 'learning';
  }

  return {
    ...state,
    n,
    interval,
    ef,
    nextReview: nextDate,
    status,
    reviewCount: state.reviewCount + 1,
    lastReview: today,
  };
}

/**
 * 判断单词今天是否需要复习
 */
export function isDueForReview(state: LearningState): boolean {
  if (state.status === 'new') return false;
  const today = new Date().toISOString().slice(0, 10);
  return state.nextReview <= today;
}

/**
 * 日期加天数
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
