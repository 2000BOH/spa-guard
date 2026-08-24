import React, { useState, useEffect } from 'react';
import type { DepartmentId, AdminSettings } from '../types';
import { AdminModal, loadAdminSettings } from './AdminModal';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string, roleName?: string) => void;
}

const DEPTS: Record<DepartmentId, { name: string; icon: string }> = {
  facilities: { name: '시설', icon: '🏢' },
  reception: { name: '리셉션', icon: '🛎️' },
  cleaning: { name: '미화', icon: '✨' },
  food: { name: '푸드', icon: '🍽️' },
  snack: { name: '스낵', icon: '☕' }
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
    
    // 그룹 구분 없이 모든 역할을 평면화하여 한 줄로 나열
    const allRoles = config.groups.flatMap(g => 
      g.roles.map(r => ({ ...r, label: g.label }))
    );

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

        {/* 인원 버튼 (한 줄로 모두 표시) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${allRoles.length}, 1fr)`,
          gap: '6px'
        }}>
          {allRoles.map((r, ri) => {
            const roleName = r.label ? `${r.label} ${r.role}` : r.role;
            return (
              <button
                key={ri}
                onClick={() => onSelectDepartment(deptId, r.name || roleName, roleName)}
                style={{
                  height: '46px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '2px 4px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                  {roleName}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {r.name || '미지정'}
                </span>
              </button>
            );
          })}
        </div>
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

        {/* 행 1: 시설 + 푸드 — 반반 */}
        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1 }}>{renderCard('facilities')}</div>
          <div style={{ flex: 1 }}>{renderCard('food')}</div>
        </div>

        {/* 행 2: 리셉션 — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('reception')}
        </div>

        {/* 행 3: 미화(남+여 모두 한 줄) — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('cleaning')}
        </div>

        {/* 행 4: 스낵(반) + 관리자 버튼(반) */}
        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1 }}>{renderCard('snack')}</div>
          <div style={{ flex: 1 }}>
            <button
              onClick={() => setIsAdminOpen(true)}
              style={{
                width: '100%',
                height: '100%',
                background: '#1e293b',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <span style={{ fontSize: '24px' }}>🔒</span>
              관리자 모드
            </button>
          </div>
        </div>
      </div>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
