import React, { useState } from 'react';
import type { DepartmentId } from '../types';
import { AdminModal } from './AdminModal';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string) => void;
}

const DEPARTMENTS: { id: DepartmentId; name: string; icon: string }[] = [
  { id: 'facilities', name: '시설 점검', icon: '♨️' },
  { id: 'reception', name: '리셉션 점검', icon: '💁‍♀️' },
  { id: 'cleaning', name: '미화 점검', icon: '🧹' },
  { id: 'food', name: '푸드 점검', icon: '🍱' },
  { id: 'snack', name: '스낵 점검', icon: '🍿' }
];

export const MainIndex: React.FC<MainIndexProps> = ({ onSelectDepartment }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          SpaGuard 통합 점검 시스템
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          점검할 부서와 담당자를 선택해 주세요.
        </p>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {DEPARTMENTS.map((dept) => (
          <div key={dept.id} style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{dept.icon}</span>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{dept.name}</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => onSelectDepartment(dept.id, `담당자 ${num}`)}
                  style={{
                    height: '40px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  담당자 {num}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer style={{ marginTop: '32px', textAlign: 'right' }}>
        <button
          onClick={() => setIsAdminOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          🔒 관리자 설정
        </button>
      </footer>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
