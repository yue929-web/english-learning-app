import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getBookById, getCombinedWordMap } from '../data/words';
import { speak } from '../lib/speech';
import type { Quality } from '../types';

interface Props {
  onBack: () => void;
}

const DETECT_LIMIT = 200; // 单轮检测词数上限
const UNKNOWN_LIMIT = 63; // 单轮选出的生词上限
const GROUP_SIZE = 7; // 学习分组大小

type Phase = 'detect' | 'learning' | 'mode' | 'next' | 'mixed' | 'testing' | 'done';
type Mark = 'known' | 'unknown';

export default function LearnPage({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const { settings, importedBooks, states } = state;

  const book =
    getBookById(settings.selectedBookId, importedBooks) || getBookById('cet4', importedBooks)!;
  const wordMap = getCombinedWordMap(importedBooks);
  const pointerKey = `ela_detect_start_${settings.selectedBookId}`;

  const [windowStart, setWindowStart] = useState(() => {
    const saved = localStorage.getItem(pointerKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [phase, setPhase] = useState<Phase>('detect');
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState<'en2zh' | 'zh2en'>('zh2en');
  const [testKind, setTestKind] = useState<'group' | 'mixed'>('group');
  const [mixedGroups, setMixedGroups] = useState<number[]>([0, 1]);
  const [passIds, setPassIds] = useState<string[]>([]);
  const [testRound, setTestRound] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const [pool, setPool] = useState<string[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [roundKnown, setRoundKnown] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);

  // 切换词书时重置本轮所有状态
  useEffect(() => {
    const saved = localStorage.getItem(pointerKey);
    setWindowStart(saved ? parseInt(saved, 10) : 0);
    setPhase('detect');
    setMarks({});
    setRevealed(new Set());
    setTestResults({});
    setPool([]);
    setGroupIndex(0);
    setRoundKnown(0);
    setVisibleCount(50);
  }, [settings.selectedBookId]);

  // 本轮检测窗口：从上次位置起，最多 200 个未掌握词
  const windowWords = useMemo(() => {
    const ids: string[] = [];
    for (let i = windowStart; i < book.wordIds.length && ids.length < DETECT_LIMIT; i++) {
      const id = book.wordIds[i];
      if (states[id]?.status === 'mastered') continue;
      if (!wordMap[id]) continue;
      ids.push(id);
    }
    return ids;
  }, [book, windowStart, states, wordMap]);

  const chunks = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < pool.length; i += GROUP_SIZE) out.push(pool.slice(i, i + GROUP_SIZE));
    return out;
  }, [pool]);

  const groupIds = chunks[groupIndex] || [];
  const groupWords = groupIds.map(id => wordMap[id]).filter(Boolean);

  const markedCount = Object.keys(marks).length;
  const unknownCount = Object.values(marks).filter(v => v === 'unknown').length;

  const toggleReveal = (wordId: string) => {
    const w = wordMap[wordId];
    if (!w) return;
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
    speak(w.word, settings.accent);
  };

  const markWord = (wordId: string, kind: Mark) => {
    setMarks(prev => {
      if (prev[wordId] === kind) {
        const next = { ...prev };
        delete next[wordId];
        return next;
      }
      if (kind === 'unknown') {
        const unknown = Object.values(prev).filter(v => v === 'unknown').length;
        if (unknown >= UNKNOWN_LIMIT) return prev; // 生词已满 63，不再增加
      }
      return { ...prev, [wordId]: kind };
    });
  };

  const clearAdvance = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const resetTestState = () => {
    setTestResults({});
    setRevealed(new Set());
    setTestRound(1);
    setPassIds([]);
    setNotice(null);
  };

  const enterGroupTest = (mode: 'en2zh' | 'zh2en') => {
    setTestMode(mode);
    setTestKind('group');
    setTestResults({});
    setRevealed(new Set());
    setTestRound(1);
    setPassIds(groupIds);
    setPhase('testing');
  };

  const enterMixedTest = (mode: 'en2zh' | 'zh2en') => {
    setTestMode(mode);
    setTestKind('mixed');
    setTestResults({});
    setRevealed(new Set());
    setTestRound(1);
    setPassIds(mixedGroups.flatMap(i => chunks[i]));
    setPhase('testing');
  };

  // 逐级回退：检测→首页，学习→检测，方式/混组→学习，答题→方式
  const handleBack = () => {
    clearAdvance();
    if (phase === 'learning') {
      setPhase('detect');
      return;
    }
    if (phase === 'mode') {
      setPhase('learning');
      return;
    }
    if (phase === 'next') {
      setPhase('learning');
      return;
    }
    if (phase === 'mixed') {
      setPhase('next');
      return;
    }
    if (phase === 'testing') {
      setPhase(testKind === 'mixed' ? 'mixed' : 'mode');
      return;
    }
    onBack();
  };

  useEffect(() => () => clearAdvance(), []);

  // 结束检测，进入学习：指针推进到本轮第一个未判定的词（全部判完则推到窗口末尾之后）
  const startLearning = () => {
    const firstUnmarked = windowWords.findIndex(id => !marks[id]);
    const nextPtr =
      firstUnmarked === -1
        ? book.wordIds.indexOf(windowWords[windowWords.length - 1]) + 1
        : book.wordIds.indexOf(windowWords[firstUnmarked]);

    localStorage.setItem(pointerKey, String(nextPtr));
    setWindowStart(nextPtr);

    const knownIds = windowWords.filter(id => marks[id] === 'known');
    if (knownIds.length) dispatch({ type: 'MARK_KNOWN_WORDS', wordIds: knownIds });

    const unknownIds = windowWords.filter(id => marks[id] === 'unknown');
    setRoundKnown(knownIds.length);
    setPool(unknownIds);
    setGroupIndex(0);
    setMarks({});
    setRevealed(new Set());
    setTestResults({});
    setPassIds([]);
    setTestRound(1);
    setTestKind('group');
    setNotice(null);
    setPhase(unknownIds.length ? 'learning' : 'done');
  };

  // 判定一个词：一遍做完后自动重考错词；全部答对则自动进入下一组
  const handleAnswer = (wordId: string, correct: boolean) => {
    const next = { ...testResults, [wordId]: correct };
    setTestResults(next);
    const quality: Quality = correct ? 5 : 0;
    dispatch({ type: 'LEARN_WORD', wordId, quality });
    if (!correct) dispatch({ type: 'ADD_TO_NOTEBOOK', wordId, source: 'wrong' });

    if (Object.keys(next).length < passIds.length) return;

    const wrong = passIds.filter(id => next[id] === false);
    clearAdvance();
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      if (wrong.length > 0) {
        setPassIds(wrong);
        setTestResults({});
        setRevealed(new Set());
        setTestRound(r => r + 1);
        return;
      }
      if (testKind === 'mixed') {
        resetTestState();
        setNotice(`混组检测完成：${mixedGroups.length} 组共 ${passIds.length} 个词全部答对`);
        if (groupIndex + 1 >= chunks.length) {
          setPhase('done');
          return;
        }
        setGroupIndex(groupIndex + 1);
        setPhase('learning');
        return;
      }
      resetTestState();
      if (groupIndex + 1 >= chunks.length) {
        setPhase('done');
        return;
      }
      setPhase('next');
    }, 700);
  };

  const continueLearning = () => {
    clearAdvance();
    setMarks({});
    setRevealed(new Set());
    setTestResults({});
    setPassIds([]);
    setTestRound(1);
    setTestKind('group');
    setNotice(null);
    setPool([]);
    setGroupIndex(0);
    setRoundKnown(0);
    setVisibleCount(50);
    setPhase('detect');
  };

  const resetBook = () => {
    dispatch({ type: 'RESET_BOOK_PROGRESS', wordIds: book.wordIds });
    localStorage.setItem(pointerKey, '0');
    setWindowStart(0);
    setMarks({});
    setRevealed(new Set());
    setPool([]);
    setGroupIndex(0);
    setRoundKnown(0);
    setVisibleCount(50);
    setPhase('detect');
  };

  // ---------- 词书已全部掌握 ----------
  if (phase === 'detect' && windowWords.length === 0) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={backBtnStyle}>
            ←
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {book.name}
          </h1>
        </div>
        <div className="empty">
          <div className="empty-icon">🎉</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>本词书已全部掌握</div>
          <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 20 }}>
            共 {book.wordIds.length} 词，没有待检测的单词了
          </div>
          <button className="btn btn-primary btn-block" onClick={resetBook}>
            重新开始本词书
          </button>
        </div>
      </div>
    );
  }

  // ---------- 本轮完成 ----------
  if (phase === 'done') {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={backBtnStyle}>
            ←
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {book.name}
          </h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>本轮完成</div>
          <div style={{ fontSize: 14, color: 'var(--text-light)', marginBottom: 4 }}>
            认识 {roundKnown} 词 · 学习 {pool.length} 个生词
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginBottom: 26 }}>
            标记为“认识”的单词以后不会再出现
          </div>
          <button className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={continueLearning}>
            继续学习 →
          </button>
          <button
            className="btn btn-block"
            style={{ background: 'var(--border)', color: 'var(--text)' }}
            onClick={onBack}
          >
            休息一下
          </button>
        </div>
      </div>
    );
  }

  // ---------- 学习环节 ----------
  const passWords = passIds.map(id => wordMap[id]).filter(Boolean);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={handleBack} style={backBtnStyle}>
          ←
        </button>
        <h1 className="page-title" style={{ marginBottom: 0, fontSize: 20 }}>
          {phase === 'detect'
            ? '检测单词'
            : phase === 'mixed' || (phase === 'testing' && testKind === 'mixed')
              ? '混组检测'
              : phase === 'next'
                ? `第 ${groupIndex + 1} 组完成`
                : `学习 · 第 ${groupIndex + 1}/${chunks.length} 组`}
        </h1>
      </div>

      {phase === 'detect' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: 'var(--text-light)',
              marginBottom: 8,
            }}
          >
            <span>
              已判定 {markedCount} / {windowWords.length}
            </span>
            <span>
              生词{' '}
              <b style={{ color: unknownCount >= UNKNOWN_LIMIT ? 'var(--danger)' : 'var(--text)' }}>
                {unknownCount}
              </b>{' '}
              / {UNKNOWN_LIMIT}
            </span>
          </div>
          <div
            style={{
              height: 5,
              borderRadius: 3,
              background: 'var(--border)',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: `${windowWords.length ? (markedCount / windowWords.length) * 100 : 0}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width .2s',
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginBottom: 10 }}>
            点击单词查看音标和释义并朗读；按自己的判断点 ✓ 或 ✗，最多选 {UNKNOWN_LIMIT} 个生词，选够了随时点底部按钮开始学习
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {windowWords.slice(0, visibleCount).map((id, idx) => {
              const w = wordMap[id];
              const mark = marks[id];
              const isRevealed = revealed.has(id);
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 13px',
                    borderRadius: 12,
                    background: mark === 'known' ? '#f6ffed' : mark === 'unknown' ? '#fff1f0' : '#fff',
                    border: `1px solid ${
                      mark === 'known' ? '#b7eb8f' : mark === 'unknown' ? '#ffccc7' : 'var(--border)'
                    }`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-lighter)', width: 26, flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleReveal(id)}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>{w.word}</span>
                      {isRevealed && (
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-lighter)',
                            fontFamily: "'Noto Sans', 'Segoe UI', 'Microsoft YaHei', sans-serif",
                          }}
                        >
                          {settings.accent === 'us' ? w.phoneticUs : w.phoneticUk}
                        </span>
                      )}
                    </div>
                    {isRevealed && (
                      <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 3 }}>
                        {w.meanings.map(m => `${m.pos} ${m.def}`).join('；')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => markWord(id, 'known')}
                      style={markBtnStyle(mark === 'known', 'var(--success)')}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => markWord(id, 'unknown')}
                      style={markBtnStyle(mark === 'unknown', 'var(--danger)')}
                    >
                      ✗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < windowWords.length && (
            <button
              className="btn btn-block"
              style={{
                marginTop: 10,
                background: '#fff',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
              }}
              onClick={() => setVisibleCount(v => v + 50)}
            >
              查看更多（还有 {windowWords.length - visibleCount} 个）
            </button>
          )}

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-lighter)', marginTop: 14 }}>
            已判定 {markedCount} / {windowWords.length} 个
          </div>

          <div style={{ height: 72 }} />

          {/* 固定在底部的开始学习按钮，滚动时始终可见 */}
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
              background: 'rgba(255,255,255,0.97)',
              borderTop: '1px solid var(--border)',
              zIndex: 60,
            }}
          >
            <button
              className="btn btn-primary btn-block"
              disabled={unknownCount === 0}
              style={{ opacity: unknownCount === 0 ? 0.45 : 1 }}
              onClick={startLearning}
            >
              {unknownCount >= UNKNOWN_LIMIT
                ? `已选满 ${UNKNOWN_LIMIT} 个生词 · 开始学习 →`
                : `开始学习（已选 ${unknownCount} 个生词）→`}
            </button>
          </div>
        </>
      )}

      {phase === 'learning' && (
        <>
          {notice && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--success)',
                marginBottom: 10,
              }}
            >
              {notice}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupWords.map(w => {
              const isRevealed = revealed.has(w.id);
              return (
                <div
                  key={w.id}
                  className="card"
                  onClick={() => toggleReveal(w.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '14px 16px',
                    borderColor: isRevealed ? 'var(--primary-light)' : 'var(--border)',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{w.word}</div>
                  {isRevealed && (
                    <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>
                      {w.meanings.map(m => `${m.pos} ${m.def}`).join('；')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
            onClick={() => {
              setTestResults({});
              setRevealed(new Set());
              setTestRound(1);
              setPhase('mode');
            }}
          >
            检测当组 →
          </button>
        </>
      )}

      {phase === 'next' && (
        <>
          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              第 {groupIndex + 1} 组完成
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              本组 {groupWords.length} 个词全部答对
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 18 }}
            onClick={() => {
              setGroupIndex(groupIndex + 1);
              resetTestState();
              setPhase('learning');
            }}
          >
            继续第 {groupIndex + 2} 组 →
          </button>
          {groupIndex >= 1 && (
            <button
              className="btn btn-block"
              style={{ marginTop: 10, background: 'var(--border)', color: 'var(--text)' }}
              onClick={() => {
                setMixedGroups(Array.from({ length: groupIndex + 1 }, (_, i) => i));
                setPhase('mixed');
              }}
            >
              混组检测（已学 {groupIndex + 1} 组）→
            </button>
          )}
        </>
      )}

      {phase === 'mode' && (
        <>
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            选择检测方式
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-lighter)',
              marginBottom: 16,
            }}
          >
            点击下面任意一种开始
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              className="card"
              style={{ cursor: 'pointer', padding: '18px 16px' }}
              onClick={() => enterGroupTest('en2zh')}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>根据英文回忆中文</div>
              <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 4 }}>
                看英文单词，回想它的中文释义
              </div>
            </div>
            <div
              className="card"
              style={{ cursor: 'pointer', padding: '18px 16px' }}
              onClick={() => enterGroupTest('zh2en')}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>根据中文回忆英文</div>
              <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 4 }}>
                看中文释义，回想英文单词
              </div>
            </div>
          </div>
        </>
      )}

      {phase === 'mixed' && (
        <>
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            混组检测
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-lighter)',
              marginBottom: 14,
            }}
          >
            勾选要混合的组，自由组合后开始检测
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            {chunks.slice(0, groupIndex + 1).map((c, i) => {
              const active = mixedGroups.includes(i);
              return (
                <button
                  key={i}
                  onClick={() =>
                    setMixedGroups(prev =>
                      active ? prev.filter(x => x !== i) : [...prev, i].sort((a, b) => a - b),
                    )
                  }
                  style={{
                    padding: '8px 14px',
                    borderRadius: 18,
                    cursor: 'pointer',
                    fontSize: 13,
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    background: active ? 'var(--primary)' : '#fff',
                    color: active ? '#fff' : 'var(--text)',
                  }}
                >
                  第 {i + 1} 组 · {c.length} 词
                </button>
              );
            })}
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: mixedGroups.length >= 2 ? 'var(--text-lighter)' : 'var(--danger)',
              marginBottom: 18,
            }}
          >
            已选 {mixedGroups.length} 组 ·{' '}
            {mixedGroups.reduce((n, i) => n + chunks[i].length, 0)} 词
            {mixedGroups.length < 2 && '（至少选择 2 个组）'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              className="card"
              style={{
                cursor: mixedGroups.length >= 2 ? 'pointer' : 'default',
                opacity: mixedGroups.length >= 2 ? 1 : 0.5,
                padding: '18px 16px',
              }}
              onClick={() => mixedGroups.length >= 2 && enterMixedTest('en2zh')}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>根据英文回忆中文</div>
              <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 4 }}>
                看英文单词，回想它的中文释义
              </div>
            </div>
            <div
              className="card"
              style={{
                cursor: mixedGroups.length >= 2 ? 'pointer' : 'default',
                opacity: mixedGroups.length >= 2 ? 1 : 0.5,
                padding: '18px 16px',
              }}
              onClick={() => mixedGroups.length >= 2 && enterMixedTest('zh2en')}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>根据中文回忆英文</div>
              <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 4 }}>
                看中文释义，回想英文单词
              </div>
            </div>
          </div>
        </>
      )}

      {phase === 'testing' && (
        <>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-light)', marginBottom: 12 }}>
            {testMode === 'en2zh' ? '根据英文回忆中文，再点卡片核对' : '根据中文回忆英文，再点卡片核对'}
            {testRound > 1 && ` · 第 ${testRound} 遍重考（${passWords.length} 词）`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {passWords.map(w => {
              const result = testResults[w.id];
              const isRevealed = revealed.has(w.id);
              const question = testMode === 'en2zh' ? w.word : w.meanings.map(m => m.def).join('；');
              const answer =
                testMode === 'en2zh'
                  ? w.meanings.map(m => `${m.pos} ${m.def}`).join('；')
                  : w.word;
              return (
                <div
                  key={w.id}
                  className="card"
                  style={{
                    padding: '12px 14px',
                    borderColor:
                      result === true ? 'var(--success)' : result === false ? 'var(--danger)' : 'var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      onClick={() => toggleReveal(w.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        cursor: 'pointer',
                        fontSize: 17,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {question}
                    </div>
                    <button
                      onClick={() => handleAnswer(w.id, true)}
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 0,
                        background: result === true ? 'var(--success)' : 'transparent',
                        color: result === true ? '#fff' : 'var(--success)',
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleAnswer(w.id, false)}
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 0,
                        background: result === false ? 'var(--danger)' : 'transparent',
                        color: result === false ? '#fff' : 'var(--danger)',
                      }}
                    >
                      ✗
                    </button>
                  </div>
                  {isRevealed && (
                    <div style={{ fontSize: 15, color: 'var(--text-light)', marginTop: 6 }}>
                      {answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-lighter)',
              marginTop: 16,
            }}
          >
            错词会自动重考，全部答对后进入下一组
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

function markBtnStyle(active: boolean, color: string) {
  return {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: `1.5px solid ${color}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : color,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  } as const;
}
