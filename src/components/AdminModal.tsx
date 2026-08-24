import React, { useState, useEffect } from 'react';
import type { AdminSettings, DepartmentId, DeptConfigMap, PersonnelGroup } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEPT_LABELS: Record<DepartmentId, string> = {
  facilities: '시설',
  reception: '리셉션',
  cleaning: '미화',
  food: '푸드',
  snack: '스낵'
};

const DEFAULT_DEPT_CONFIGS: DeptConfigMap = {
  facilities: { groups: [{ roles: [{ role: '주간', name: '' }, { role: '야간', name: '' }] }] },
  reception: { groups: [{ roles: [{ role: '오전', name: '' }, { role: '오후', name: '' }, { role: '야간', name: '' }] }] },
  cleaning: {
    groups: [
      { label: '남자', roles: [{ role: '주간', name: '' }, { role: '야간', name: '' }] },
      { label: '여자', roles: [{ role: '주간', name: '' }] }
    ]
  },
  food: { groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }] },
  snack: { groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }] }
};

const DEFAULT_SETTINGS: AdminSettings = {
  defaultTargetTemp: 10.0,
  defaultBackwashCount: 2,
  hairCatcherMonthlyCount: 2,
  deptConfigs: DEFAULT_DEPT_CONFIGS
};

/** 로컬스토리지에서 관리자 설정 로드 (외부에서도 사용 가능) */
export function loadAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('spa_admin_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const mergedConfigs: DeptConfigMap = { ...DEFAULT_DEPT_CONFIGS };
      
      // 하위 호환 처리 및 병합 (새로운 roles 구조가 없으면 기본값 유지)
      if (parsed.deptConfigs) {
        for (const key of Object.keys(DEFAULT_DEPT_CONFIGS) as DepartmentId[]) {
          const pConfig = parsed.deptConfigs[key];
          if (pConfig && pConfig.groups && pConfig.groups[0] && Array.isArray(pConfig.groups[0].roles)) {
            mergedConfigs[key] = pConfig;
          }
        }
      }
      return {
        defaultTargetTemp: parsed.defaultTargetTemp ?? DEFAULT_SETTINGS.defaultTargetTemp,
        defaultBackwashCount: parsed.defaultBackwashCount ?? DEFAULT_SETTINGS.defaultBackwashCount,
        hairCatcherMonthlyCount: parsed.hairCatcherMonthlyCount ?? DEFAULT_SETTINGS.hairCatcherMonthlyCount,
        deptConfigs: mergedConfigs
      };
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SETTINGS;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsAuth(false);
      setErrorMsg('');
      setSettings(loadAdminSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuth = () => {
    if (pin === '0000') {
      setIsAuth(true);
      setErrorMsg('');
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      setPin('');
    }
  };

  const handleSave = () => {
    localStorage.setItem('spa_admin_settings', JSON.stringify(settings));
    alert('관리자 설정이 저장되었습니다.');
    onClose();
  };

  // 그룹 내 특정 역할의 담당자 이름 변경
  const updateRoleName = (dept: DepartmentId, groupIdx: number, roleIdx: number, name: string) => {
    const newConfigs = { ...settings.deptConfigs };
    const newGroups = newConfigs[dept].groups.map((g, gi) => {
      if (gi !== groupIdx) return g;
      const newRoles = [...g.roles];
      newRoles[roleIdx] = { ...newRoles[roleIdx], name };
      return { ...g, roles: newRoles };
    });
    newConfigs[dept] = { groups: newGroups };
    setSettings({ ...settings, deptConfigs: newConfigs });
  };

  const inputStyle: React.CSSProperties = { width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '10px' };

  const renderGroupEditor = (dept: DepartmentId, group: PersonnelGroup, groupIdx: number) => {
    const groupLabel = group.label ? ` (${group.label})` : '';
    return (
      <div key={groupIdx} style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
            {DEPT_LABELS[dept]}{groupLabel}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
          {group.roles.map((r, ri) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '60px', fontSize: '11px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                {r.role}
              </div>
              <input
                type="text"
                placeholder="담당자 이름"
                value={r.name}
                onChange={(e) => updateRoleName(dept, groupIdx, ri, e.target.value)}
                style={{ ...inputStyle, flex: 1, height: '28px', fontSize: '11px' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>⚙️ 관리자 설정</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {!isAuth ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              관리자 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={pin}
              placeholder="4자리 비밀번호"
              maxLength={4}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              style={{
                width: '180px', height: '44px', fontSize: '18px', textAlign: 'center',
                letterSpacing: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px'
              }}
            />
            {errorMsg && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{errorMsg}</div>}
            <button
              onClick={handleAuth}
              style={{
                width: '180px', height: '44px', background: '#1e293b', color: '#fff',
                fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer'
              }}
            >
              확인
            </button>
          </div>
        ) : (
          <div style={{ padding: '6px 0' }}>
            {/* ── 점검 기준값 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              📏 점검 기준값
            </h4>

            <div style={sectionStyle}>
              <label style={labelStyle}>기본 기준온도 (℃)</label>
              <input
                type="number" step="0.1"
                value={settings.defaultTargetTemp}
                onChange={(e) => setSettings({ ...settings, defaultTargetTemp: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', ...sectionStyle }}>
              <div>
                <label style={labelStyle}>역세척 (주간 횟수)</label>
                <select
                  value={settings.defaultBackwashCount}
                  onChange={(e) => setSettings({ ...settings, defaultBackwashCount: parseInt(e.target.value, 10) })}
                  style={inputStyle}
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}회</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>헤어캐처 (월간 횟수)</label>
                <select
                  value={settings.hairCatcherMonthlyCount}
                  onChange={(e) => setSettings({ ...settings, hairCatcherMonthlyCount: parseInt(e.target.value, 10) })}
                  style={inputStyle}
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}회</option>)}
                </select>
              </div>
            </div>

            {/* ── 파트별 담당자 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              👥 파트별 지정 담당자 입력
            </h4>

            {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((dept) => (
              <div key={dept} style={sectionStyle}>
                {settings.deptConfigs[dept].groups.map((group, gi) =>
                  renderGroupEditor(dept, group, gi)
                )}
              </div>
            ))}

            <button
              onClick={handleSave}
              style={{
                width: '100%', height: '40px', background: '#2563eb', color: '#fff',
                fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '4px'
              }}
            >
              설정 저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
