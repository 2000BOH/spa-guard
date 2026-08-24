import React, { useState, useEffect } from 'react';
import type { DepartmentId, AdminSettings } from '../types';
import { AdminModal, loadAdminSettings } from './AdminModal';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string) => void;
}

const DEPTS: Record<DepartmentId, { name: string; icon: string }> = {
  facilities: { name: '시설', icon: '♨️' },
  reception: { name: '리셉션', icon: '💁‍♀️' },
  cleaning: { name: '미화', icon: '🧹' },
  food: { name: '푸드', icon: '🍱' },
  snack: { name: '스낵', icon: '🍿' }
};

export const MainIndex: React.FC<MainIndexProps> = ({ onSelectDepartment }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(loadAdminSettings());

  useEffect(() => {
    if (!isAdminOpen) setSettings(loadAdminSettings());
  }, [isAdminOpen]);

  /** 파트별 카드 렌더링 */
  const renderCard = (deptId: DepartmentId) => {
    const dept = DEPTS[deptId];
    const config = settings.deptConfigs[deptId];

    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '8px 12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100%',
        boxSizing: 'border-box'
      }}>
        {/* 파트명 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '20px' }}>{dept.icon}</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{dept.name}</span>
        </div>

        {/* 인원 버튼 */}
        {config.groups.map((group, gi) => (
          <div key={gi} style={gi > 0 ? { marginTop: '4px' } : undefined}>
            {group.label && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                {group.label}
              </span>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(group.names.length, 3)}, 1fr)`,
              gap: '6px'
            }}>
              {group.names.map((name, ni) => (
                <button
                  key={ni}
                  onClick={() => onSelectDepartment(deptId, name)}
                  style={{
                    height: '36px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#334155',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f1f5f9',
      overflow: 'hidden',
      boxSizing: 'border-box',
      padding: '10px 10px 6px'
    }}>
      {/* ── 타이틀 ── */}
      <header style={{ textAlign: 'center', marginBottom: '8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
          Blue Ocean Wellness Spa
        </h1>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
          점검할 부서와 담당자를 선택하세요
        </p>
      </header>

      {/* ── 파트 카드 그리드 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>

        {/* 행 1: 시설(2명) + 푸드(2명) — 작은 파트끼리 나란히 */}
        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1 }}>{renderCard('facilities')}</div>
          <div style={{ flex: 1 }}>{renderCard('food')}</div>
        </div>

        {/* 행 2: 리셉션(6명) — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('reception')}
        </div>

        {/* 행 3: 미화(남3+여2) — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('cleaning')}
        </div>

        {/* 행 4: 스낵(6명) — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('snack')}
        </div>
      </div>

      {/* ── 하단 관리자 ── */}
      <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '4px' }}>
        <button onClick={() => setIsAdminOpen(true)} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px'
        }}>
          🔒 관리자
        </button>
      </div>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
