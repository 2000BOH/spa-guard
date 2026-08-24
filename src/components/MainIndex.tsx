import React, { useState, useEffect } from 'react';
import type { DepartmentId, AdminSettings } from '../types';
import { AdminModal, loadAdminSettings } from './AdminModal';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string) => void;
}

const DEPT_LIST: { id: DepartmentId; name: string; icon: string }[] = [
  { id: 'facilities', name: '시설', icon: '♨️' },
  { id: 'reception', name: '리셉션', icon: '💁‍♀️' },
  { id: 'cleaning', name: '미화', icon: '🧹' },
  { id: 'food', name: '푸드', icon: '🍱' },
  { id: 'snack', name: '스낵', icon: '🍿' }
];

// 좌우 교대 배치: 작은 파트와 큰 파트를 교대 배치하여 시각적 균형
const TREE_LAYOUT: { deptIdx: number; side: 'left' | 'right' }[] = [
  { deptIdx: 0, side: 'left' },   // 시설 (2명)
  { deptIdx: 1, side: 'right' },  // 리셉션 (6명)
  { deptIdx: 2, side: 'left' },   // 미화 (남3+여2)
  { deptIdx: 4, side: 'right' },  // 스낵 (6명)
  { deptIdx: 3, side: 'left' },   // 푸드 (2명)
];

const CONNECTOR_W = 14;
const CARD_M = 4;

export const MainIndex: React.FC<MainIndexProps> = ({ onSelectDepartment }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(loadAdminSettings());

  useEffect(() => {
    if (!isAdminOpen) setSettings(loadAdminSettings());
  }, [isAdminOpen]);

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f1f5f9',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* ── Root Node (타이틀) ── */}
      <div style={{
        textAlign: 'center',
        padding: '12px 0 0',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'inline-block',
          background: '#0f172a',
          color: '#f1f5f9',
          padding: '8px 22px',
          borderRadius: '22px',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          boxShadow: '0 3px 12px rgba(15,23,42,0.18)'
        }}>
          Blue Ocean Wellness Spa
        </div>
      </div>

      {/* ── Tree Body (마인드맵) ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        padding: '0 4px'
      }}>
        {/* 중앙 수직 연결선 (Spine) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'linear-gradient(180deg, #64748b 0%, #cbd5e1 100%)',
          transform: 'translateX(-50%)',
          zIndex: 0
        }} />

        {TREE_LAYOUT.map(({ deptIdx, side }) => {
          const dept = DEPT_LIST[deptIdx];
          const config = settings.deptConfigs[dept.id];

          return (
            <div key={dept.id} style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
              position: 'relative',
              zIndex: 1
            }}>
              {/* 분기점 원형 노드 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#64748b',
                border: '2px solid #f1f5f9',
                transform: 'translate(-50%, -50%)',
                zIndex: 3
              }} />

              {/* 수평 연결선 (카드 → 중앙 스파인) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                height: '2px',
                background: '#94a3b8',
                zIndex: 1,
                ...(side === 'left'
                  ? { left: `calc(50% - ${CONNECTOR_W}px)`, width: `${CONNECTOR_W}px` }
                  : { left: '50%', width: `${CONNECTOR_W}px` }
                )
              }} />

              {/* ── Department Card ── */}
              <div style={{
                width: `calc(50% - ${CONNECTOR_W + CARD_M}px)`,
                background: '#ffffff',
                borderRadius: '10px',
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                ...(side === 'left'
                  ? { marginLeft: `${CARD_M}px` }
                  : { marginRight: `${CARD_M}px` }
                )
              }}>
                {/* 파트명 헤더 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '4px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '3px'
                }}>
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>{dept.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{dept.name}</span>
                </div>

                {/* 인원 버튼 그룹 */}
                {config.groups.map((group, gi) => (
                  <div key={gi} style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '3px',
                    alignItems: 'center',
                    ...(gi > 0 ? { marginTop: '3px' } : {})
                  }}>
                    {group.label && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        minWidth: '18px'
                      }}>
                        {group.label}
                      </span>
                    )}
                    {group.names.map((name, ni) => (
                      <button
                        key={ni}
                        onClick={() => onSelectDepartment(dept.id, name)}
                        style={{
                          height: '24px',
                          padding: '0 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          color: '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '64px',
                          transition: 'background 0.15s'
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'right', flexShrink: 0, padding: '2px 8px 6px' }}>
        <button onClick={() => setIsAdminOpen(true)} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: '10px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px'
        }}>
          🔒 관리자
        </button>
      </div>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
