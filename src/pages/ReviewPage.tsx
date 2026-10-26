import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { getBookById, getCombinedWordMap } from '../data/words';
import { isDueForReview } from '../lib/sm2';
import { speak } from '../lib/speech';
import type { Quality, ReviewMode } from '../types';

interface Props {
  onBack: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewPage({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const { states, settings, importedBooks } = state;

  const book = getBookById(settings.selectedBookId, importedBooks) || getBookById('cet4', importedBooks)!;
  const wordMap = getCombinedWordMap(importedBooks);
  const bookWords = book.wordIds.map(id => wordMap[id]).filter(Boolean);
  const dueIds = book.wordIds.filter(id => states[id] && isDueForReview(states[id]));

  const [queue] = useState(() => shuffle(dueIds));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // 为当前题目随机选择一种复习形式
  const [mode, setMode] = useState<ReviewMode>('choice');
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (index < queue.length) {
      const modes = settings.reviewModes;
      const m = modes[Math.floor(Math.random() * modes.length)];
      setMode(m);
      setSelected(null);
      setShowAnswer(false);

      // 生成选项（用于 choice 和 listen 模式）
      if (m === 'choice' || m === 'listen') {
        const correctId = queue[index];
        const correctWord = wordMap[correctId];
        // 从同词书随机选 3 个干扰项
        const distractors = shuffle(
          bookWords.filter(w => w.id !== correctId)
        ).slice(0, 3);
        const opts = shuffle([correctWord, ...distractors].map(w =>
          m === 'choice' ? w.meanings[0].def : w.word
        ));
        setOptions(opts);

        // listen 模式自动播放发音
        if (m === 'listen') {
          setTimeout(() => speak(correctWord.word, settings.accent), 300);
        }
      }
    }
  }, [index, queue, settings.reviewModes, settings.accent]);

  if (queue.length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">🎉</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>今日暂无复习任务</div>
          <div style={{ color: 'var(--text-light)' }}>明天再来看看吧</div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={onBack}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    const total = queue.length;
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>复习完成</div>
          <div style={{ color: 'var(--text-light)' }}>
            共 {total} 题，正确 {correctCount} 题，正确率 {total > 0 ? Math.round(correctCount / total * 100) : 0}%
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={onBack}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const wordId = queue[index];
  const word = wordMap[wordId];

  const finish = (correct: boolean, q: Quality) => {
    dispatch({ type: 'REVIEW_WORD', wordId, quality: q, correct });
    if (correct) setCorrectCount(c => c + 1);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  const handleOptionClick = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setShowAnswer(true);
    const correct = mode === 'choice'
      ? opt === word.meanings[0].def
      : opt === word.word;
    setTimeout(() => finish(correct, correct ? 5 : 0), 800);
  };

  const handleCardQuality = (q: Quality) => {
    finish(q >= 3, q);
  };

  return (
    <div className="page">
      {/* 顶部进度 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', fontSize: 20, color: 'var(--text)' }}>←</button>
        <div style={{ flex: 1 }}>
          <div className="progress-bar" style={{ margin: 0 }}>
            <div className="progress-fill" style={{ width: `${(index / queue.length) * 100}%` }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-light)' }}>{index + 1}/{queue.length}</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: 10,
          background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12,
        }}>
          {mode === 'choice' ? '看词选义' : mode === 'listen' ? '听音辨词' : '卡片复习'}
        </span>
      </div>

      {/* 看词选义 */}
      {mode === 'choice' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{word.word}</div>
            <div style={{ fontSize: 14, color: 'var(--text-light)' }}>{word.phoneticUs}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map((opt, i) => {
              const isCorrect = opt === word.meanings[0].def;
              let style: React.CSSProperties = {
                padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: '#fff', fontSize: 15, textAlign: 'left',
              };
              if (showAnswer && isCorrect) style = { ...style, background: '#f6ffed', borderColor: 'var(--success)' };
              else if (showAnswer && selected === opt && !isCorrect) style = { ...style, background: '#fff1f0', borderColor: 'var(--danger)' };
              return (
                <button key={i} style={style} onClick={() => handleOptionClick(opt)}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 听音辨词 */}
      {mode === 'listen' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              onClick={() => speak(word.word, settings.accent)}
              style={{ fontSize: 48, background: 'none', color: 'var(--primary)' }}
            >
              🔊
            </button>
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>点击重听</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map((opt, i) => {
              const isCorrect = opt === word.word;
              let style: React.CSSProperties = {
                padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: '#fff', fontSize: 18, fontWeight: 600,
              };
              if (showAnswer && isCorrect) style = { ...style, background: '#f6ffed', borderColor: 'var(--success)' };
              else if (showAnswer && selected === opt && !isCorrect) style = { ...style, background: '#fff1f0', borderColor: 'var(--danger)' };
              return (
                <button key={i} style={style} onClick={() => handleOptionClick(opt)}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 卡片复习 */}
      {mode === 'card' && (
        <div className="card" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{word.word}</div>
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--primary)' }}
              onClick={() => speak(word.word, settings.accent)}
            >
              🔊 {settings.accent === 'us' ? word.phoneticUs : word.phoneticUk}
            </div>
          </div>
          {showAnswer && (
            <div style={{ marginTop: 24 }}>
              {word.meanings.map((m, i) => (
                <div key={i} style={{ marginBottom: 6, fontSize: 16 }}>
                  <span style={{ color: 'var(--text-light)', marginRight: 8 }}>{m.pos}</span>{m.def}
                </div>
              ))}
            </div>
          )}
          {!showAnswer && (
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 24 }}
              onClick={() => setShowAnswer(true)}
            >
              显示答案
            </button>
          )}
        </div>
      )}

      {/* 卡片模式的三键 */}
      {mode === 'card' && showAnswer && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn" style={{ flex: 1, background: '#fff1f0', color: 'var(--danger)' }} onClick={() => handleCardQuality(0)}>不认识</button>
          <button className="btn" style={{ flex: 1, background: '#fff7e6', color: 'var(--warning)' }} onClick={() => handleCardQuality(3)}>模糊</button>
          <button className="btn" style={{ flex: 1, background: '#f6ffed', color: 'var(--success)' }} onClick={() => handleCardQuality(5)}>认识</button>
        </div>
      )}
    </div>
  );
}
