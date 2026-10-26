import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getAllBooks, getBookById } from '../data/words';
import { isDueForReview } from '../lib/sm2';

interface Props {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: Props) {
  const { state, dispatch } = useApp();
  const { states, settings, stats, streak, importedBooks } = state;

  const [showBookPicker, setShowBookPicker] = useState(false);

  const allBooks = getAllBooks(importedBooks);
  const book = getBookById(settings.selectedBookId, importedBooks) || allBooks[0];
  const allWordIds = book.wordIds;

  // 计算各项统计
  const newWords = allWordIds.filter(id => !states[id] || states[id].status === 'new');
  const learningWords = allWordIds.filter(id => states[id]?.status === 'learning');
  const masteredWords = allWordIds.filter(id => states[id]?.status === 'mastered');

  // 今日待复习
  const dueWords = allWordIds.filter(id => states[id] && isDueForReview(states[id]));

  // 今日已学/已复习
  const today = new Date().toISOString().slice(0, 10);
  const todayStat = stats.find(s => s.date === today);
  const todayLearned = todayStat?.learned || 0;
  const todayReviewed = todayStat?.reviewed || 0;

  // 今日新学进度
  const newProgress = Math.min(todayLearned / settings.dailyGoal, 1);

  // 切换词书
  const selectBook = (bookId: string) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { selectedBookId: bookId } });
    localStorage.removeItem('ela_group_start');
    setShowBookPicker(false);
  };

  return (
    <div className="page">
      <h1 className="page-title">今日学习</h1>

      {/* 词书选择 */}
      <div
        className="card"
        onClick={() => setShowBookPicker(!showBookPicker)}
        style={{ cursor: 'pointer', marginBottom: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>当前词书</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{book.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-lighter)' }}>{book.description}</div>
          </div>
          <div style={{
            background: 'var(--primary-light)', color: 'var(--primary)',
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          }}>
            切换 ▾
          </div>
        </div>
      </div>

      {/* 词书选择弹窗 */}
      {showBookPicker && (
        <div className="card" style={{ marginBottom: 16, padding: 8 }}>
          {allBooks.map(b => {
            const bMastered = b.wordIds.filter(id => states[id]?.status === 'mastered').length;
            const isActive = b.id === settings.selectedBookId;
            const isImported = !b.builtIn;
            return (
              <div
                key={b.id}
                onClick={() => selectBook(b.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  margin: '4px 0',
                  cursor: 'pointer',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {b.name}
                      {isImported && (
                        <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 4 }}>导入</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{b.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-lighter)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div>{b.wordIds.length} 词</div>
                      <div style={{ color: 'var(--success)' }}>已掌握 {bMastered}</div>
                    </div>
                    {isImported && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除词书「${b.name}」吗？`)) {
                            dispatch({ type: 'DELETE_IMPORTED_BOOK', bookId: b.id });
                          }
                        }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--danger)',
                          fontSize: 16, cursor: 'pointer', padding: '4px 8px',
                        }}
                      >🗑</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 导入词库入口 */}
          <div
            onClick={() => { setShowBookPicker(false); onNavigate('import'); }}
            style={{
              padding: '14px 16px', borderRadius: 10, margin: '4px 0',
              cursor: 'pointer', border: '2px dashed var(--border)',
              textAlign: 'center', color: 'var(--text-light)',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 500 }}>+ 导入词库</span>
          </div>
        </div>
      )}

      {/* 打卡与进度 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>连续打卡</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
              {streak.current} <span style={{ fontSize: 14, color: 'var(--text-light)' }}>天</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>今日新学</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {todayLearned} / {settings.dailyGoal}
            </div>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${newProgress * 100}%` }} />
        </div>
      </div>

      {/* 学习入口 */}
      <div className="card" onClick={() => onNavigate('learn')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>学习新单词</div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              待学新词 {newWords.length} 个
            </div>
          </div>
          <div style={{
            background: 'var(--primary)', color: '#fff', padding: '10px 20px',
            borderRadius: 12, fontWeight: 600, fontSize: 15,
          }}>
            开始 →
          </div>
        </div>
      </div>

      {/* 复习入口 */}
      <div
        className="card"
        onClick={() => dueWords.length > 0 && onNavigate('review')}
        style={{ cursor: dueWords.length > 0 ? 'pointer' : 'default', opacity: dueWords.length > 0 ? 1 : 0.6 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>复习单词</div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              {dueWords.length > 0 ? `待复习 ${dueWords.length} 个` : '今日暂无复习任务'}
            </div>
          </div>
          <div style={{
            background: dueWords.length > 0 ? 'var(--accent)' : 'var(--border)',
            color: dueWords.length > 0 ? '#fff' : 'var(--text-lighter)',
            padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 15,
          }}>
            复习 →
          </div>
        </div>
      </div>

      {/* 词书进度 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{book.name} 进度</div>
          <div style={{ fontSize: 12, color: 'var(--text-lighter)' }}>点击查看单词 ›</div>
        </div>
        <div className="stat-row">
          <div className="stat-item" onClick={() => onNavigate('words:new')} style={{ cursor: 'pointer' }}>
            <div className="stat-num">{newWords.length}</div>
            <div className="stat-label">未学习</div>
          </div>
          <div
            className="stat-item"
            onClick={() => onNavigate('words:learning')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-num" style={{ color: 'var(--warning)' }}>{learningWords.length}</div>
            <div className="stat-label">学习中</div>
          </div>
          <div
            className="stat-item"
            onClick={() => onNavigate('words:mastered')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-num" style={{ color: 'var(--success)' }}>{masteredWords.length}</div>
            <div className="stat-label">已掌握</div>
          </div>
        </div>
      </div>

      {/* 今日统计 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>今日数据</div>
        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-num">{todayLearned}</div>
            <div className="stat-label">新学单词</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{todayReviewed}</div>
            <div className="stat-label">复习次数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
