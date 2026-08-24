import React, { useState, useEffect } from 'react';
import type { DepartmentId } from '../types';
import { AdminModal, loadAdminSettings } from './AdminModal';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string) => void;
}

const DEPARTMENTS: { id: DepartmentId; name: string; icon: string }[] = [
  { id: 'facilities', name: '시설', icon: '♨️' },
  { id: 'reception', name: '리셉션', icon: '💁‍♀️' },
  { id: 'cleaning', name: '미화', icon: '🧹' },
  { id: 'food', name: '푸드', icon: '🍱' },
  { id: 'snack', name: '스낵', icon: '🍿' }
];

export const MainIndex: React.FC<MainIndexProps> = ({ onSelectDepartment }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminSettings, setAdminSettingsState] = useState(loadAdminSettings());

  // 관리자 모달이 닫힐 때 최신 데이터를 다시 로드
  useEffect(() => {
    if (!isAdminOpen) {
      setAdminSettingsState(loadAdminSettings());
    }
  }, [isAdminOpen]);

  return (
    <div style={{
      height: '100dvh',
      backgroundColor: '#f8fafc',
      padding: '10px 12px 6px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* ── 타이틀 ── */}
      <header style={{ textAlign: 'center', marginBottom: '10px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', letterSpacing: '0.5px' }}>
          Blue Ocean Wellness Spa
        </h1>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
          점검할 부서와 담당자를 선택해 주세요
        </p>
      </header>

      {/* ── 파트 목록 ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        minHeight: 0
      }}>
        {DEPARTMENTS.map((dept) => {
          const config = adminSettings.deptConfigs[dept.id];
          const groups = config.groups;

          return (
            <div key={dept.id} style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '6px 10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              {groups.map((group, gi) => (
                <div key={gi} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: gi > 0 ? '4px' : 0
                }}>
                  {/* 파트 라벨 (첫 번째 그룹에만 아이콘, 서브그룹이면 라벨 추가) */}
                  <div style={{ minWidth: '70px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {gi === 0 && <span style={{ fontSize: '14px' }}>{dept.icon}</span>}
                    {gi > 0 && <span style={{ width: '14px', display: 'inline-block' }} />}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                      {gi === 0 ? dept.name : ''}
                      {group.label && <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', marginLeft: gi === 0 ? '2px' : 0 }}>({group.label})</span>}
                    </span>
                  </div>

                  {/* 담당자 버튼 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                    {group.names.map((name, ni) => (
                      <button
                        key={ni}
                        onClick={() => onSelectDepartment(dept.id, name)}
                        style={{
                          height: '28px',
                          minWidth: '56px',
                          flex: '1 1 0',
                          maxWidth: '100px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '0 4px'
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
        })}
      </div>

      {/* ── 하단 관리자 ── */}
      <footer style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
        <button
          onClick={() => setIsAdminOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 6px'
          }}
        >
          🔒 관리자
        </button>
      </footer>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
