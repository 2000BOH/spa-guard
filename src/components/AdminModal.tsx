import React, { useState, useEffect } from 'react';
import type { AdminSettings, DepartmentId, DeptPersonnel } from '../types';

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

const DEFAULT_PERSONNEL: DeptPersonnel = {
  facilities: ['담당자 1', '담당자 2', '담당자 3'],
  reception: ['담당자 1', '담당자 2', '담당자 3'],
  cleaning: ['담당자 1', '담당자 2', '담당자 3'],
  food: ['담당자 1', '담당자 2', '담당자 3'],
  snack: ['담당자 1', '담당자 2', '담당자 3']
};

const DEFAULT_SETTINGS: AdminSettings = {
  defaultTargetTemp: 10.0,
  defaultBackwashCount: 2,
  hairCatcherMonthlyCount: 2,
  personnel: DEFAULT_PERSONNEL
};

/** 로컬스토리지에서 관리자 설정 로드하는 유틸리티 함수 (외부에서도 사용 가능) */
export function loadAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('spa_admin_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved), personnel: { ...DEFAULT_PERSONNEL, ...(JSON.parse(saved).personnel || {}) } };
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

  const updatePersonnelName = (dept: DepartmentId, idx: number, name: string) => {
    const newPersonnel = { ...settings.personnel };
    const arr: [string, string, string] = [...newPersonnel[dept]];
    arr[idx] = name;
    newPersonnel[dept] = arr;
    setSettings({ ...settings, personnel: newPersonnel });
  };

  const inputStyle = { width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '14px' };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
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
          <div style={{ padding: '10px 0' }}>
            {/* ── 점검 기준값 설정 ── */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', ...sectionStyle }}>
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

            {/* ── 파트별 인원 설정 ── */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', marginTop: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              👥 파트별 점검자 이름
            </h4>

            {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((dept) => (
              <div key={dept} style={sectionStyle}>
                <label style={{ ...labelStyle, color: '#475569' }}>{DEPT_LABELS[dept]}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`${idx + 1}번`}
                      value={settings.personnel[dept][idx]}
                      onChange={(e) => updatePersonnelName(dept, idx, e.target.value)}
                      style={{ ...inputStyle, height: '32px', fontSize: '12px', textAlign: 'center' }}
                    />
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSave}
              style={{
                width: '100%', height: '44px', background: '#2563eb', color: '#fff',
                fontSize: '15px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '8px'
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
