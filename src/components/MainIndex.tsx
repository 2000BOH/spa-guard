import React, { useState, useEffect } from 'react';
import type { DepartmentId, AdminSettings } from '../types';
import { AdminModal, loadAdminSettings } from './AdminModal';
import { WORK_RULES } from '../data/workRulesData';
import { getDeptInspectionStatus } from '../lib/deptStatus';

interface MainIndexProps {
  onSelectDepartment: (dept: DepartmentId, inspector: string, roleName?: string) => void;
  onOpenPanel: (timeLabel: string) => void;
}

const DEPTS: Record<DepartmentId, { name: string; icon: string }> = {
  facilities: { name: '시설', icon: '🛠️' },
  reception: { name: '리셉션', icon: '🛎️' },
  cleaning: { name: '미화', icon: '🧹' },
  food: { name: '푸드', icon: '🍽️' },
  snack: { name: '스낵', icon: '☕' }
};

function getTodayStr(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const MainIndex: React.FC<MainIndexProps> = ({ onSelectDepartment, onOpenPanel }) => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [workRulesDept, setWorkRulesDept] = useState<DepartmentId | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(loadAdminSettings());

  useEffect(() => {
    if (!isAdminOpen) setSettings(loadAdminSettings());
  }, [isAdminOpen]);

  /** 파트별 카드 렌더링 */
  const renderCard = (deptId: DepartmentId) => {
    const dept = DEPTS[deptId];
    const config = settings.deptConfigs[deptId];
    const todayStr = getTodayStr();
    
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '20px' }}>{dept.icon}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{dept.name}</span>
          </div>
          <button
            onClick={() => setWorkRulesDept(deptId)}
            style={{
              background: '#ffffff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '4px',
              padding: '2px 7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '3px'
            }}
          >
            <span>📋</span> 근무수칙
          </button>
        </div>

        {/* 인원 버튼 (한 줄로 모두 표시) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${allRoles.length}, 1fr)`,
          gap: '6px'
        }}>
          {allRoles.map((r, ri) => {
            const roleName = r.label ? `${r.label} ${r.role}` : r.role;
            const statusInfo = getDeptInspectionStatus(todayStr, deptId, roleName);
            
            // 점검자가 직접 일지에 진입하여 이름을 선택했을 때만 배정된 것으로 판별
            const hasAssignedInspector = statusInfo.status !== 'none' && Boolean(statusInfo.inspector) && statusInfo.inspector !== '점검자';
            const assignedName = hasAssignedInspector ? statusInfo.inspector : '';
            const status = statusInfo.status;

            let bgColor = '#f1f5f9';
            let borderColor = '#cbd5e1';
            let badgeText = '';
            let badgeColor = '';

            if (status === 'in_progress' && hasAssignedInspector) {
              bgColor = '#fef3c7';
              borderColor = '#f59e0b';
              badgeText = '🟡 점검중';
              badgeColor = '#d97706';
            } else if (status === 'completed' && hasAssignedInspector) {
              bgColor = '#cbd5e1'; // 음영 처리된 버튼 스타일
              borderColor = '#64748b';
              badgeText = '🟢 점검완료';
              badgeColor = '#15803d';
            }

            return (
              <button
                key={ri}
                onClick={() => onSelectDepartment(deptId, assignedName || '점검자', roleName)}
                style={{
                  height: '52px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  color: status === 'completed' ? '#1e293b' : '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '2px 4px',
                  boxShadow: status === 'completed' ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: status === 'completed' ? '#475569' : '#64748b' }}>
                  {roleName}
                </span>

                <span style={{
                  fontSize: '12px',
                  fontWeight: hasAssignedInspector ? 700 : 500,
                  color: hasAssignedInspector ? '#0f172a' : '#94a3b8',
                  marginTop: '1px'
                }}>
                  {hasAssignedInspector ? assignedName : '점검 전'}
                </span>

                {badgeText && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: badgeColor,
                    marginTop: '2px'
                  }}>
                    {badgeText}
                  </span>
                )}
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
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0, padding: '0 4px' }}>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
            Blue Ocean Wellness Spa
          </h1>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
            점검할 부서와 담당자를 선택하세요
          </p>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setIsAdminOpen(true)}
            style={{
              background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px',
              padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', height: 'fit-content'
            }}
          >
            <span style={{ fontSize: '12px' }}>🔒</span> 관리자
          </button>
        </div>
      </header>

      {/* ── 파트 카드 그리드 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0 }}>

        {/* 행 1: 시설 + 기계실 패널 (00시 / 03시 / 06시) */}
        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1 }}>{renderCard('facilities')}</div>
          <div style={{ flex: 1, background: '#1e293b', borderRadius: '12px', padding: '6px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>⚙️</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>기계실 (패널)</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['00시', '03시', '06시'].map((t) => (
                <button
                  key={t}
                  onClick={() => onOpenPanel(t)}
                  style={{
                    flex: 1, height: '40px', background: '#334155', color: '#94a3b8',
                    border: '1px solid #475569', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                  onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#334155'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                  onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#334155'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 행 2: 리셉션 — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('reception')}
        </div>

        {/* 행 3: 미화(남+여 모두 한 줄) — 전체 너비 */}
        <div style={{ flex: 1 }}>
          {renderCard('cleaning')}
        </div>

        {/* 행 4: 스낵(반) + 푸드(반) */}
        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1 }}>{renderCard('snack')}</div>
          <div style={{ flex: 1 }}>{renderCard('food')}</div>
        </div>
      </div>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      {/* ── 근무수칙 모달 ── */}
      {workRulesDept && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#f1f5f9', borderRadius: '12px', width: '100%', maxWidth: '400px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: '#2c3574', padding: '16px 20px', display: 'flex', flexDirection: 'column', color: '#fff', position: 'relative'
            }}>
              <button
                onClick={() => setWorkRulesDept(null)}
                style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
              <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#cbd5e1', marginBottom: '8px' }}>
                BLUE OCEAN · WELLNESS SPA
              </div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
                {DEPTS[workRulesDept].name} 근무수칙
              </h3>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {WORK_RULES[workRulesDept] ? (
                WORK_RULES[workRulesDept].map((section, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: '#fce7e7', color: '#b91c1c', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
                        {idx + 1}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{section.title}</h4>
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '16px' }}></div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {section.items.map((item, iIdx) => (
                        <li key={iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', lineHeight: 1.6, color: '#475569' }}>
                          <span style={{ color: '#8b96c8', fontSize: '18px', lineHeight: '20px' }}>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  현재 내용 업데이트 중입니다. (추후 반영 예정)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
