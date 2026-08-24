import React from 'react';
import type { DepartmentId } from '../types';

interface ComingSoonProps {
  department: DepartmentId;
  inspector: string;
  onBack: () => void;
}

const DEPT_NAMES: Record<DepartmentId, string> = {
  facilities: '시설',
  reception: '리셉션',
  cleaning: '미화',
  food: '푸드',
  snack: '스낵'
};

export const ComingSoon: React.FC<ComingSoonProps> = ({ department, inspector, onBack }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
        {DEPT_NAMES[department]} 점검일지 준비중
      </h2>
      <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>
        현재 해당 파트의 체크리스트를 구성 중입니다.<br/>
        선택된 점검자: <strong>{inspector}</strong>
      </p>
      
      <button 
        onClick={onBack}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '15px',
          border: 'none',
          boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
          cursor: 'pointer'
        }}
      >
        ← 메인으로 돌아가기
      </button>
    </div>
  );
};
