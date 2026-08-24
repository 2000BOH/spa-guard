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
  const [personnelNames, setPersonnelNames] = useState(loadAdminSettings().personnel);

  // 관리자 모달이 닫힐 때 이름 데이터를 다시 로드
  useEffect(() => {
    if (!isAdminOpen) {
      setPersonnelNames(loadAdminSettings().personnel);
    }
  }, [isAdminOpen]);

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#f8fafc',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* ── 타이틀 ── */}
      <header style={{ textAlign: 'center', marginBottom: '8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '0.5px' }}>
          Blue Ocean Wellness Spa
        </h1>
        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
          점검할 부서와 담당자를 선택해 주세요.
        </p>
      </header>

      {/* ── 5개 파트 그리드 (한 화면에 다 담기게) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minHeight: 0,
        justifyContent: 'center'
      }}>
        {DEPARTMENTS.map((dept) => {
          const names = personnelNames[dept.id];
          return (
            <div key={dept.id} style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {/* 파트 라벨 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '72px', flexShrink: 0 }}>
                <span style={{ fontSize: '16px' }}>{dept.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{dept.name}</span>
              </div>

              {/* 3명의 버튼 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', flex: 1 }}>
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectDepartment(dept.id, names[idx])}
                    style={{
                      height: '34px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '0 4px'
                    }}
                  >
                    {names[idx]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 하단 관리자 ── */}
      <footer style={{ textAlign: 'right', flexShrink: 0, paddingTop: '4px' }}>
        <button
          onClick={() => setIsAdminOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          🔒 관리자 설정
        </button>
      </footer>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
