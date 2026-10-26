import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { getBookById, getAllBooks } from '../data/words';

export default function StatsPage() {
  const { state } = useApp();
  const { states, stats, streak, settings, importedBooks } = state;

  const book = getBookById(settings.selectedBookId, importedBooks) || getBookById('cet4', importedBooks)!;
  const allIds = book.wordIds;

  const total = allIds.length;
  const learned = allIds.filter(id => states[id] && states[id].status !== 'new').length;
  const mastered = allIds.filter(id => states[id]?.status === 'mastered').length;
  const learning = allIds.filter(id => states[id]?.status === 'learning').length;

  // 近 14 天累计学习曲线
  const cumulativeData = useMemo(() => {
    const days: { date: string; label: string; learned: number; reviewed: number; cumLearned: number; cumReviewed: number }[] = [];
    let cumL = 0;
    let cumR = 0;
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const s = stats.find(x => x.date === dateStr);
      cumL += s?.learned || 0;
      cumR += s?.reviewed || 0;
      days.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        learned: s?.learned || 0,
        reviewed: s?.reviewed || 0,
        cumLearned: cumL,
        cumReviewed: cumR,
      });
    }
    return days;
  }, [stats]);

  const maxCum = Math.max(1, ...cumulativeData.map(d => Math.max(d.cumLearned, d.cumReviewed)));
  const cumWidth = cumulativeData.length * 28;

  // 近 7 天柱状图（学习+复习）
  const last7Days = useMemo(() => {
    const days: { date: string; label: string; learned: number; reviewed: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const s = stats.find(x => x.date === dateStr);
      days.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        learned: s?.learned || 0,
        reviewed: s?.reviewed || 0,
      });
    }
    return days;
  }, [stats]);

  const maxVal = Math.max(1, ...last7Days.map(d => Math.max(d.learned, d.reviewed)));

  const totalLearned = stats.reduce((sum, s) => sum + s.learned, 0);

  // 各词书掌握情况对比
  const allBooks = getAllBooks(importedBooks);
  const bookStats = allBooks.map(b => {
    const t = b.wordIds.length;
    const m = b.wordIds.filter(id => states[id]?.status === 'mastered').length;
    const l = b.wordIds.filter(id => states[id] && states[id].status !== 'new').length;
    return {
      id: b.id,
      name: b.name,
      total: t,
      learned: l,
      mastered: m,
      rate: t > 0 ? Math.round((l / t) * 100) : 0,
      isActive: b.id === settings.selectedBookId,
    };
  });

  // 掌握率：已掌握 / 已学
  const masteryRate = learned > 0 ? Math.round((mastered / learned) * 100) : 0;

  // 折线图 SVG 路径
  const buildPath = (values: number[], max: number, w: number, h: number) => {
    if (values.length < 2) return '';
    const stepX = w / (values.length - 1);
    return values.map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const cumLPath = buildPath(cumulativeData.map(d => d.cumLearned), maxCum, cumWidth, 100);
  const cumRPath = buildPath(cumulativeData.map(d => d.cumReviewed), maxCum, cumWidth, 100);

  return (
    <div className="page">
      <h1 className="page-title">学习统计</h1>

      {/* 核心指标 */}
      <div className="stat-row" style={{ marginBottom: 12 }}>
        <div className="stat-item">
          <div className="stat-num">{streak.current}</div>
          <div className="stat-label">连续打卡</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{totalLearned}</div>
          <div className="stat-label">累计学习</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{masteryRate}%</div>
          <div className="stat-label">掌握率</div>
        </div>
      </div>

      {/* 词书掌握度 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>词书掌握度</div>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{book.name}</div>
        </div>
        <div className="progress-bar" style={{ height: 12 }}>
          <div className="progress-fill" style={{
            width: `${(learned / total) * 100}%`,
            background: `linear-gradient(90deg, var(--warning) ${(learning / (learned || 1)) * 100}%, var(--success) 0)`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
          <span>已学 {learned}/{total}（{Math.round((learned / total) * 100)}%）</span>
          <span style={{ color: 'var(--success)' }}>掌握 {mastered}</span>
        </div>
      </div>

      {/* 近 7 天学习（柱状图） */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>近 7 天学习</div>
        <div className="bar-chart">
          {last7Days.map(d => (
            <div key={d.date} className="bar-col">
              <div className="bar-group">
                <div
                  className="bar bar-review"
                  style={{ height: `${(d.reviewed / maxVal) * 100}%`, minHeight: d.reviewed > 0 ? 4 : 0 }}
                  title={`复习 ${d.reviewed}`}
                />
                <div
                  className="bar bar-learn"
                  style={{ height: `${(d.learned / maxVal) * 100}%`, minHeight: d.learned > 0 ? 4 : 0 }}
                  title={`学习 ${d.learned}`}
                />
              </div>
              <div className="bar-label">{d.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="legend-dot" style={{ background: 'var(--primary)' }} />学习
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="legend-dot" style={{ background: 'var(--accent)' }} />复习
          </span>
        </div>
      </div>

      {/* 累计学习曲线（折线图） */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>累计学习趋势（近 14 天）</div>
        <div className="line-chart-wrap">
          <svg width={cumWidth} height="120" viewBox={`0 0 ${cumWidth} 110`} className="line-chart">
            {/* 网格线 */}
            {[0, 25, 50, 75, 100].map(y => (
              <line key={y} x1="0" y1={y} x2={cumWidth} y2={y} stroke="#f0f1f5" strokeWidth="1" />
            ))}
            {/* 复习曲线 */}
            <path d={cumRPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" pathLength={1} />
            {/* 学习曲线 */}
            <path d={cumLPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
            {/* 数据点 */}
            {cumulativeData.map((d, i) => {
              const stepX = cumWidth / (cumulativeData.length - 1);
              const x = i * stepX;
              const yL = 100 - (d.cumLearned / maxCum) * 100;
              return (
                <circle key={d.date} cx={x} cy={yL} r="2.5" fill="var(--primary)" />
              );
            })}
          </svg>
        </div>
        <div className="line-chart-labels">
          <span>{cumulativeData[0].label}</span>
          <span>{cumulativeData[Math.floor(cumulativeData.length / 2)].label}</span>
          <span>{cumulativeData[cumulativeData.length - 1].label}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="legend-line" style={{ background: 'var(--primary)' }} />累计学习
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="legend-line" style={{ background: 'var(--accent)', opacity: 0.7 }} />累计复习
          </span>
        </div>
      </div>

      {/* 各词书对比 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>词书进度对比</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookStats.map(b => (
            <div key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: b.isActive ? 600 : 400, color: b.isActive ? 'var(--primary)' : 'var(--text)' }}>
                  {b.isActive && '● '}{b.name}
                </span>
                <span style={{ color: 'var(--text-light)' }}>
                  {b.learned}/{b.total} · {b.rate}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 8, margin: 0 }}>
                <div className="progress-fill" style={{
                  width: `${b.rate}%`,
                  background: b.isActive ? 'var(--primary)' : 'var(--border)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
