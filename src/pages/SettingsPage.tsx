import { useApp } from '../store/AppContext';
import { useState } from 'react';
import type { ReviewMode } from '../types';
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  currentProfileId,
} from '../lib/storage';
import type { Profile } from '../lib/storage';

const dailyGoals = [10, 20, 30, 50];
const reviewModes: { value: ReviewMode; label: string }[] = [
  { value: 'choice', label: '看词选义' },
  { value: 'listen', label: '听音辨词' },
  { value: 'card', label: '卡片复习' },
];

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const [profiles, setProfiles] = useState<Profile[]>(() => listProfiles());
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const currentId = currentProfileId();

  const toggleReviewMode = (mode: ReviewMode) => {
    const modes = settings.reviewModes.includes(mode)
      ? settings.reviewModes.filter(m => m !== mode)
      : [...settings.reviewModes, mode];
    if (modes.length === 0) return; // 至少保留一种
    dispatch({ type: 'UPDATE_SETTINGS', settings: { reviewModes: modes } });
  };

  return (
    <div className="page">
      <h1 className="page-title">设置</h1>

      {/* 每日学习目标 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>每日学习目标</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {dailyGoals.map(g => (
            <button
              key={g}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { dailyGoal: g } })}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: settings.dailyGoal === g ? 'var(--primary)' : 'var(--bg)',
                color: settings.dailyGoal === g ? '#fff' : 'var(--text)',
              }}
            >
              {g} 个
            </button>
          ))}
        </div>
      </div>

      {/* 发音偏好 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>发音偏好</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { accent: 'us' } })}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: settings.accent === 'us' ? 'var(--primary)' : 'var(--bg)',
              color: settings.accent === 'us' ? '#fff' : 'var(--text)',
            }}
          >
            🇺🇸 美音
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { accent: 'uk' } })}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: settings.accent === 'uk' ? 'var(--primary)' : 'var(--bg)',
              color: settings.accent === 'uk' ? '#fff' : 'var(--text)',
            }}
          >
            🇬🇧 英音
          </button>
        </div>
      </div>

      {/* 复习形式 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>复习形式</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviewModes.map(m => (
            <button
              key={m.value}
              onClick={() => toggleReviewMode(m.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10,
                background: settings.reviewModes.includes(m.value) ? 'var(--primary-light)' : 'var(--bg)',
              }}
            >
              <span style={{ fontSize: 15 }}>{m.label}</span>
              <span style={{
                width: 20, height: 20, borderRadius: 4,
                background: settings.reviewModes.includes(m.value) ? 'var(--primary)' : '#fff',
                border: '2px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12,
              }}>
                {settings.reviewModes.includes(m.value) ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginTop: 8 }}>
          复习时将从已选形式中随机分配
        </div>
      </div>

      {/* 用户 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>用户</div>
        <div style={{ fontSize: 12, color: 'var(--text-lighter)', marginBottom: 10 }}>
          每个用户的进度、生词本和统计完全独立
        </div>
        {profiles.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 0',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ flex: 1, fontSize: 14, fontWeight: p.id === currentId ? 600 : 400 }}>
              {p.name}
              {p.id === currentId && (
                <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 6 }}>当前</span>
              )}
            </span>
            {p.id !== currentId && (
              <button
                onClick={() => {
                  switchProfile(p.id);
                  window.location.reload();
                }}
                style={{ background: 'none', fontSize: 13, color: 'var(--primary)' }}
              >
                切换
              </button>
            )}
            <button
              disabled={profiles.length === 1}
              onClick={() => {
                if (confirmDelete !== p.id) {
                  setConfirmDelete(p.id);
                  return;
                }
                deleteProfile(p.id);
                setConfirmDelete(null);
                setProfiles(listProfiles());
                if (p.id === currentId) window.location.reload();
              }}
              style={{
                background: 'none',
                fontSize: 13,
                color: profiles.length === 1 ? 'var(--border)' : confirmDelete === p.id ? 'var(--danger)' : 'var(--text-lighter)',
              }}
            >
              {confirmDelete === p.id ? '确认删除' : '删除'}
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="新用户名称"
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (!newName.trim()) return;
              createProfile(newName);
              setProfiles(listProfiles());
              setNewName('');
            }}
            style={{
              padding: '0 18px',
              borderRadius: 10,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            新建
          </button>
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>关于</div>
        <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.8 }}>
          英语学习 App · 单词板块 MVP<br />
          基于 SM-2 间隔重复算法<br />
          v1.0.0
        </div>
      </div>
    </div>
  );
}
