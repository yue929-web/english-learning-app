import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getBookById, getCombinedWordMap } from '../data/words';
import { speak } from '../lib/speech';

export type WordTab = 'new' | 'learning' | 'mastered';

interface Props {
  initialTab: WordTab;
  onBack: () => void;
}

const PAGE_SIZE = 50;

const tabMeta: { key: WordTab; label: string; color: string }[] = [
  { key: 'new', label: '未学习', color: 'var(--text)' },
  { key: 'learning', label: '学习中', color: 'var(--warning)' },
  { key: 'mastered', label: '已掌握', color: 'var(--success)' },
];

export default function WordListPage({ initialTab, onBack }: Props) {
  const { state } = useApp();
  const { settings, importedBooks, states } = state;

  const book =
    getBookById(settings.selectedBookId, importedBooks) || getBookById('cet4', importedBooks)!;
  const wordMap = getCombinedWordMap(importedBooks);

  const [tab, setTab] = useState<WordTab>(initialTab);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setTab(initialTab);
    setVisible(PAGE_SIZE);
  }, [initialTab]);

  const groups = useMemo(() => {
    const out: Record<WordTab, string[]> = { new: [], learning: [], mastered: [] };
    for (const id of book.wordIds) {
      if (!wordMap[id]) continue;
      const status = states[id]?.status || 'new';
      out[status === 'new' ? 'new' : status === 'learning' ? 'learning' : 'mastered'].push(id);
    }
    return out;
  }, [book, wordMap, states]);

  const ids = groups[tab];
  const current = tabMeta.find(t => t.key === tab)!;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <button onClick={onBack} style={backBtnStyle}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title" style={{ marginBottom: 2, fontSize: 20 }}>
            {book.name}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-lighter)' }}>
            共 {book.wordIds.length} 词
          </div>
        </div>
      </div>

      {/* 状态切换 */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--border)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 14,
        }}
      >
        {tabMeta.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setVisible(PAGE_SIZE);
              }}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 9,
                border: 'none',
                background: active ? '#fff' : 'transparent',
                color: active ? t.color : 'var(--text-light)',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
              }}
            >
              {t.label} {groups[t.key].length}
            </button>
          );
        })}
      </div>

      {ids.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div style={{ fontSize: 14, color: 'var(--text-light)' }}>这里还没有单词</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginBottom: 8 }}>
            点击单词即可朗读，共 {ids.length} 个
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ids.slice(0, visible).map((id, idx) => {
              const w = wordMap[id];
              return (
                <div
                  key={id}
                  onClick={() => speak(w.word, settings.accent)}
                  style={{
                    padding: '11px 14px',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-lighter)', width: 26, flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{w.word}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-light)',
                      marginTop: 3,
                      paddingLeft: 34,
                    }}
                  >
                    {w.meanings.map(m => `${m.pos} ${m.def}`).join('；')}
                  </div>
                </div>
              );
            })}
          </div>
          {visible < ids.length && (
            <button
              className="btn btn-block"
              style={{
                marginTop: 12,
                background: '#fff',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
              }}
              onClick={() => setVisible(v => v + PAGE_SIZE)}
            >
              查看更多（还有 {ids.length - visible} 个）
            </button>
          )}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-lighter)',
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            当前：{current.label} · 已显示 {Math.min(visible, ids.length)} / {ids.length}
          </div>
        </>
      )}
    </div>
  );
}

const backBtnStyle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#fff',
  border: '1px solid var(--border)',
  fontSize: 18,
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;
