import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { wordMap } from '../data/words';
import { speak } from '../lib/speech';

export default function NotebookPage() {
  const { state, dispatch } = useApp();
  const { notebook, settings } = state;
  const [onlyRepeat, setOnlyRepeat] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = useMemo(
    () =>
      notebook
        .map(n => ({
          ...n,
          wrongCount: n.wrongCount ?? (n.source === 'wrong' ? 1 : 0),
          word: wordMap[n.wordId],
        }))
        .filter(n => n.word)
        .sort(
          (a, b) =>
            (b.wrongCount ?? 0) - (a.wrongCount ?? 0) || b.addedAt.localeCompare(a.addedAt),
        ),
    [notebook],
  );

  const shown = onlyRepeat ? items.filter(i => (i.wrongCount ?? 0) >= 2) : items;

  return (
    <div className="page">
      <h1 className="page-title">生词本</h1>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <div>生词本还是空的</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            学习或检测中答错的词会自动收录，按答错次数排序
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              共 {items.length} 词
            </div>
            <button
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                dispatch({ type: 'CLEAR_NOTEBOOK' });
                setConfirmClear(false);
              }}
              onBlur={() => setConfirmClear(false)}
              style={{
                background: 'none',
                fontSize: 12,
                color: confirmClear ? 'var(--danger)' : 'var(--text-lighter)',
                fontWeight: confirmClear ? 600 : 400,
              }}
            >
              {confirmClear ? '确认清空？' : '清空'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { key: false, label: `全部 ${items.length}` },
              { key: true, label: `错 2 次以上 ${items.filter(i => (i.wrongCount ?? 0) >= 2).length}` },
            ].map(opt => (
              <button
                key={String(opt.key)}
                onClick={() => setOnlyRepeat(opt.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: `1px solid ${onlyRepeat === opt.key ? 'var(--primary)' : 'var(--border)'}`,
                  background: onlyRepeat === opt.key ? 'var(--primary)' : '#fff',
                  color: onlyRepeat === opt.key ? '#fff' : 'var(--text-light)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-lighter)', padding: '30px 0' }}>
              没有错 2 次以上的词
            </div>
          ) : (
            shown.map(item => {
              const open = expanded === item.wordId;
              return (
                <div
                  key={item.wordId}
                  className="card"
                  style={{ padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    if (open) {
                      setExpanded(null);
                      return;
                    }
                    setExpanded(item.wordId);
                    speak(item.word.word, settings.accent);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{item.word.word}</span>
                    {open && <span style={{ color: 'var(--primary)', fontSize: 14 }}>🔊</span>}
                    {open && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          dispatch({ type: 'REMOVE_FROM_NOTEBOOK', wordId: item.wordId });
                        }}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          color: 'var(--text-lighter)',
                          fontSize: 16,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {open && (
                    <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 6 }}>
                      {item.word.meanings.map(m => `${m.pos} ${m.def}`).join('；')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
