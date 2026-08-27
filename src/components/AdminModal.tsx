import React, { useState, useEffect } from 'react';
import type { AdminSettings, DepartmentId, DeptConfigMap } from '../types';

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
  deptConfigs: DEFAULT_DEPT_CONFIGS,
  enableMachineRoomPanel: false,
  nfcMappings: []
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
        deptConfigs: mergedConfigs,
        enableMachineRoomPanel: parsed.enableMachineRoomPanel ?? DEFAULT_SETTINGS.enableMachineRoomPanel,
        nfcMappings: parsed.nfcMappings ?? DEFAULT_SETTINGS.nfcMappings
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
  const [showPannelEditor, setShowPannelEditor] = useState(false);

  const [poolInputs, setPoolInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsAuth(false);
      setErrorMsg('');
      setShowPannelEditor(false);
      const loadedSettings = loadAdminSettings();
      setSettings(loadedSettings);
      
      const initialPools: Record<string, string> = {};
      (Object.keys(DEPT_LABELS) as DepartmentId[]).forEach(dept => {
        initialPools[dept] = (loadedSettings.deptConfigs[dept as DepartmentId]?.inspectorPool || []).join(', ');
      });
      setPoolInputs(initialPools);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (showPannelEditor) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10000, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px', background: '#1e293b', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setShowPannelEditor(false)} 
            style={{ color: '#fff', background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            ← 관리자 설정으로 돌아가기
          </button>
        </div>
        <iframe src="/pannel.html?mode=admin" style={{ flex: 1, border: 'none', background: '#fff' }} />
      </div>
    );
  }

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

  // 부서별 점검자 풀(목록) 업데이트
  const updateInspectorPool = (dept: DepartmentId, value: string) => {
    setPoolInputs(prev => ({ ...prev, [dept]: value }));
    const newConfigs = { ...settings.deptConfigs };
    const pool = value.split(',').map(s => s.trim()).filter(Boolean);
    newConfigs[dept] = { ...newConfigs[dept], inspectorPool: pool };
    setSettings({ ...settings, deptConfigs: newConfigs });
  };

  const inputStyle: React.CSSProperties = { width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '10px' };

  const renderDeptEditor = (dept: DepartmentId) => {
    const poolString = poolInputs[dept] || '';
    
    return (
      <div key={dept} style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
            {DEPT_LABELS[dept]} 파트 점검자 풀
          </span>
        </div>
        <div>
          <input
            type="text"
            placeholder="점검자 이름 (쉼표로 구분하여 입력, 예: 홍길동, 김철수)"
            value={poolString}
            onChange={(e) => updateInspectorPool(dept, e.target.value)}
            style={{ ...inputStyle, flex: 1, fontSize: '12px' }}
          />
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
            입력된 이름들은 점검 화면에서 선택 목록으로 제공됩니다.
          </div>
        </div>
      </div>
    );
  };

  const addNfcMapping = () => {
    const current = settings.nfcMappings || [];
    setSettings({ ...settings, nfcMappings: [...current, { id: String(current.length + 1), dept: 'facilities', name: '', roleName: '' }] });
  };

  const updateNfcMapping = (index: number, field: string, value: string) => {
    const current = [...(settings.nfcMappings || [])];
    current[index] = { ...current[index], [field]: value };
    setSettings({ ...settings, nfcMappings: current });
  };

  const removeNfcMapping = (index: number) => {
    const current = [...(settings.nfcMappings || [])];
    current.splice(index, 1);
    setSettings({ ...settings, nfcMappings: current });
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
            {/* ── 기계실 패널 설정 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              ⚙️ 관리자 · 설정 편집
            </h4>
            
            <div style={{ ...sectionStyle, marginBottom: '16px' }}>
              <button
                onClick={() => setShowPannelEditor(true)}
                style={{
                  width: '100%', height: '42px', background: '#334155', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <span>⚙️</span> 기계실 패널 설정 편집 (pannel.html)
              </button>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                버튼 위치 등 기준값을 설정합니다. 점검자는 메인화면에서 시간을 선택하여 확인합니다.
              </div>
            </div>

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
              renderDeptEditor(dept)
            ))}

            {/* ── NFC 태그 설정 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              📱 NFC 태그 설정
            </h4>
            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {(settings.nfcMappings || []).map((mapping, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text" placeholder="NFC 번호 (예: 1)" value={mapping.id}
                    onChange={(e) => updateNfcMapping(idx, 'id', e.target.value)}
                    style={{ ...inputStyle, width: '70px', fontSize: '11px' }}
                  />
                  <select
                    value={mapping.dept}
                    onChange={(e) => updateNfcMapping(idx, 'dept', e.target.value)}
                    style={{ ...inputStyle, width: '80px', fontSize: '11px', padding: '0 4px' }}
                  >
                    {(Object.keys(DEPT_LABELS) as DepartmentId[]).map(d => (
                      <option key={d} value={d}>{DEPT_LABELS[d]}</option>
                    ))}
                  </select>
                  <input
                    type="text" placeholder="담당자명" value={mapping.name}
                    onChange={(e) => updateNfcMapping(idx, 'name', e.target.value)}
                    style={{ ...inputStyle, flex: 1, fontSize: '11px' }}
                  />
                  <input
                    type="text" placeholder="역할명(선택)" value={mapping.roleName || ''}
                    onChange={(e) => updateNfcMapping(idx, 'roleName', e.target.value)}
                    style={{ ...inputStyle, flex: 1, fontSize: '11px' }}
                  />
                  <button
                    onClick={() => removeNfcMapping(idx)}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 8px', height: '32px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                onClick={addNfcMapping}
                style={{
                  width: '100%', height: '32px', background: '#e2e8f0', color: '#334155',
                  border: '1px dashed #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                + NFC 태그 추가
              </button>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                * 휴대폰 NFC 앱으로 [https://(호스팅주소)/?nfc=번호] 를 태그에 기록하세요.
              </div>
            </div>

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
