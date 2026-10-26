import { useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { parseWordFile, rawWordsToWords } from '../lib/wordParser';
import type { RawWord } from '../lib/wordParser';
import type { ImportedBook } from '../types';

interface Props {
  onBack: () => void;
}

export default function ImportPage({ onBack }: Props) {
  const { dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [rawWords, setRawWords] = useState<RawWord[]>([]);
  const [bookName, setBookName] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = parseWordFile(content, file.name);
        if (parsed.length === 0) {
          setError('未解析到有效单词');
          return;
        }
        setRawWords(parsed);
        setBookName(file.name.replace(/\.[^.]+$/, ''));
        setStep('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const confirmImport = () => {
    if (!bookName.trim()) {
      setError('请输入词书名称');
      return;
    }
    const words = rawWordsToWords(rawWords);
    const book: ImportedBook = {
      id: `import_${Date.now()}`,
      name: bookName.trim(),
      description: `导入自 ${fileName}（${words.length} 词）`,
      words,
      importedAt: new Date().toISOString(),
    };
    dispatch({ type: 'IMPORT_BOOK', book });
    setStep('done');
  };

  const reset = () => {
    setStep('select');
    setRawWords([]);
    setBookName('');
    setError('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewCount = Math.min(rawWords.length, 10);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', fontSize: 20, color: 'var(--text)' }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>导入词库</h1>
      </div>

      {error && (
        <div style={{
          background: '#fff1f0', color: 'var(--danger)', padding: '12px 16px',
          borderRadius: 10, marginBottom: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* 步骤1：选择文件 */}
      {step === 'select' && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 16, padding: '48px 20px',
              textAlign: 'center', cursor: 'pointer', marginBottom: 20,
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>点击选择词库文件</div>
            <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
              支持 JSON、CSV、TXT 格式
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>支持的文件格式</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>JSON 格式</div>
              <pre style={{
                background: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 12,
                overflowX: 'auto', margin: 0, lineHeight: 1.6,
              }}>{`[
  { "word": "apple", "phonetic": "/ˈæpl/", "meaning": "苹果" },
  { "word": "book", "phonetic": "/bʊk/", "meaning": "书" }
]`}</pre>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>CSV / TXT 格式</div>
              <pre style={{
                background: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 12,
                overflowX: 'auto', margin: 0, lineHeight: 1.6,
              }}>{`word,phonetic,meaning
apple,/ˈæpl/,苹果
book,/bʊk/,书`}</pre>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
                也可省略音标：apple,苹果
              </div>
            </div>
          </div>
        </>
      )}

      {/* 步骤2：预览 */}
      {step === 'preview' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              解析成功：共 {rawWords.length} 个单词
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-light)', display: 'block', marginBottom: 6 }}>
                词书名称
              </label>
              <input
                type="text"
                value={bookName}
                onChange={e => setBookName(e.target.value)}
                placeholder="输入词书名称"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', fontSize: 15, boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
              预览（前 {previewCount} 个）：
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
              {rawWords.slice(0, previewCount).map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'baseline', gap: 12,
                  padding: '8px 12px', background: '#f9f9f9', borderRadius: 8,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, flexShrink: 0 }}>{w.word}</span>
                  {w.phoneticUs && (
                    <span style={{ fontSize: 12, color: 'var(--text-light)', flexShrink: 0 }}>{w.phoneticUs}</span>
                  )}
                  <span style={{ fontSize: 14, color: 'var(--text-light)' }}>
                    {w.meanings.map(m => m.def).join('；')}
                  </span>
                </div>
              ))}
            </div>
            {rawWords.length > previewCount && (
              <div style={{ fontSize: 12, color: 'var(--text-lighter)', textAlign: 'center', marginTop: 8 }}>
                ...还有 {rawWords.length - previewCount} 个单词
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={reset}>返回</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirmImport}>
              确认导入
            </button>
          </div>
        </>
      )}

      {/* 步骤3：完成 */}
      {step === 'done' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>导入成功！</div>
          <div style={{ color: 'var(--text-light)', marginBottom: 24 }}>
            词书「{bookName}」已添加，共 {rawWords.length} 个单词
          </div>
          <button className="btn btn-primary btn-block" onClick={onBack}>
            返回首页
          </button>
        </div>
      )}
    </div>
  );
}
