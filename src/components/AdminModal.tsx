import React, { useState, useEffect } from 'react';
import MachineRoomPanel from './MachineRoomPanel';
import type { AdminSettings, DepartmentId, DeptConfigMap, DeptConfig } from '../types';
import { NFC_BASE_NUMBERS } from '../types';

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

export const DEFAULT_DEPT_CONFIGS: DeptConfigMap = {
  facilities: {
    groups: [{ roles: [{ role: '주간', name: '' }, { role: '야간', name: '' }] }]
  },
  reception: {
    groups: [{ roles: [{ role: '오전', name: '' }, { role: '오후', name: '' }, { role: '야간', name: '' }] }]
  },
  cleaning: {
    groups: [
      { label: '남자', roles: [{ role: '주간', name: '' }, { role: '야간', name: '' }] },
      { label: '여자', roles: [{ role: '주간', name: '' }] }
    ]
  },
  food: {
    groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }]
  },
  snack: {
    groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }]
  }
};

export interface FlatRoleItem {
  roleLabel: string;
  groupIndex: number;
  roleIndex: number;
  flatIndex: number;
  nfcNum: number;
}

export function getDeptFlatRoles(dept: DepartmentId, deptConfig?: DeptConfig): FlatRoleItem[] {
  const base = NFC_BASE_NUMBERS[dept];
  const config = deptConfig || DEFAULT_DEPT_CONFIGS[dept];
  const items: FlatRoleItem[] = [];
  let idx = 0;

  if (config && config.groups) {
    config.groups.forEach((grp, gIdx) => {
      grp.roles.forEach((r, rIdx) => {
        const label = grp.label ? `${grp.label} ${r.role}` : r.role;
        items.push({
          roleLabel: label,
          groupIndex: gIdx,
          roleIndex: rIdx,
          flatIndex: idx,
          nfcNum: base + idx
        });
        idx++;
      });
    });
  }

  return items;
}

const DEFAULT_SETTINGS: AdminSettings = {
  defaultTargetTemp: 10.0,
  defaultBackwashCount: 2,
  hairCatcherMonthlyCount: 2,
  deptConfigs: DEFAULT_DEPT_CONFIGS,
  enableMachineRoomPanel: false
};

export function loadAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('spa_admin_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const mergedConfigs: DeptConfigMap = { ...DEFAULT_DEPT_CONFIGS };
      
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
        enableMachineRoomPanel: parsed.enableMachineRoomPanel ?? DEFAULT_SETTINGS.enableMachineRoomPanel
      };
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SETTINGS;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [showPannelEditor, setShowPannelEditor] = useState(false);

  // 파트(부서)별 통합 담당자 이름 목록 state (DepartmentId -> string[])
  const [deptInspectorInputs, setDeptInspectorInputs] = useState<Record<DepartmentId, string[]>>({
    facilities: [''],
    reception: [''],
    cleaning: [''],
    food: [''],
    snack: ['']
  });

  useEffect(() => {
    if (isOpen) {
      setShowPannelEditor(false);
      const loadedSettings = loadAdminSettings();
      setSettings(loadedSettings);
      
      const initialInputs: Record<DepartmentId, string[]> = {
        facilities: [],
        reception: [],
        cleaning: [],
        food: [],
        snack: []
      };

      (Object.keys(DEPT_LABELS) as DepartmentId[]).forEach(dept => {
        const deptConfig = loadedSettings.deptConfigs[dept];
        const namesSet = new Set<string>();

        if (deptConfig?.inspectorPool) {
          deptConfig.inspectorPool.forEach(p => p.split(',').forEach(n => n.trim() && namesSet.add(n.trim())));
        }
        deptConfig?.groups?.forEach(grp => {
          grp.roles?.forEach(r => {
            if (r.names && r.names.length > 0) {
              r.names.forEach(n => n.trim() && namesSet.add(n.trim()));
            } else if (r.name) {
              r.name.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
            }
          });
        });

        const list = Array.from(namesSet);
        initialInputs[dept] = list.length > 0 ? list : [''];
      });

      setDeptInspectorInputs(initialInputs);
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
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <MachineRoomPanel admin={true} />
        </div>
      </div>
    );
  }

  const handleSave = () => {
    localStorage.setItem('spa_admin_settings', JSON.stringify(settings));
    alert('관리자 설정이 저장되었습니다.');
    onClose();
  };

  const updateDeptNamesList = (dept: DepartmentId, newList: string[]) => {
    const cleaned = newList.length > 0 ? newList : [''];
    setDeptInspectorInputs(prev => ({ ...prev, [dept]: cleaned }));

    const validNames = cleaned.map(n => n.trim()).filter(Boolean);
    const newConfigs = { ...settings.deptConfigs };
    const deptConf = { ...newConfigs[dept] };
    const groups = JSON.parse(JSON.stringify(deptConf.groups || DEFAULT_DEPT_CONFIGS[dept].groups));

    // 각 역할(roles) 및 inspectorPool에 이름 적용
    let idx = 0;
    groups.forEach((grp: any) => {
      grp.roles?.forEach((r: any) => {
        const assignedName = validNames[idx] || validNames[0] || '';
        r.name = assignedName;
        r.names = validNames;
        idx++;
      });
    });

    deptConf.groups = groups;
    deptConf.inspectorPool = validNames;
    newConfigs[dept] = deptConf;

    setSettings(prev => ({ ...prev, deptConfigs: newConfigs }));
  };

  const addDeptInspectorInput = (dept: DepartmentId) => {
    const currentList = deptInspectorInputs[dept] || [''];
    updateDeptNamesList(dept, [...currentList, '']);
  };

  const removeDeptInspectorInput = (dept: DepartmentId, nameIdx: number) => {
    const currentList = deptInspectorInputs[dept] || [''];
    const updated = currentList.filter((_, idx) => idx !== nameIdx);
    updateDeptNamesList(dept, updated.length > 0 ? updated : ['']);
  };

  const changeDeptInspectorName = (dept: DepartmentId, nameIdx: number, val: string) => {
    const currentList = [...(deptInspectorInputs[dept] || [''])];
    currentList[nameIdx] = val;
    updateDeptNamesList(dept, currentList);
  };

  const inputStyle: React.CSSProperties = { width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '10px' };

  const renderDeptEditor = (dept: DepartmentId) => {
    const nameList = deptInspectorInputs[dept] || [''];

    return (
      <div key={dept} style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            🏢 {DEPT_LABELS[dept]} 파트 지정 담당자
          </span>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
            NFC 기준: {NFC_BASE_NUMBERS[dept]}번 대역~
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nameList.map((nameVal, nIdx) => (
            <div key={nIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                placeholder={`${DEPT_LABELS[dept]} 담당자 성+이름 (예: 홍길동)`}
                value={nameVal}
                onChange={(e) => changeDeptInspectorName(dept, nIdx, e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              {nameList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDeptInspectorInput(dept, nIdx)}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px',
                    width: '28px', height: '32px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => addDeptInspectorInput(dept)}
            style={{
              background: '#f1f5f9', color: '#2563eb', border: '1px dashed #93c5fd', borderRadius: '5px',
              padding: '7px 0', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px', width: '100%'
            }}
          >
            + 담당자 추가
          </button>
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

            {/* ── 파트별 역할 지정 담당자 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              👥 파트별 지정 담당자 입력 (역할/시간대별 1대1 매핑)
            </h4>

            {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((dept) => (
              renderDeptEditor(dept)
            ))}

            <button
              onClick={handleSave}
              style={{
                width: '100%', height: '44px', background: '#2563eb', color: '#fff',
                fontSize: '15px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '16px', marginBottom: '16px'
              }}
            >
              💾 설정 저장
            </button>

            {/* ── Vercel 다이렉트 주소 메모 ── */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
              📌 Vercel 다이렉트 바로가기 주소 메모
            </h4>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#1e3a8a', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '6px', color: '#1e40af' }}>
                🔗 배포 사이트 (Vercel) 다이렉트 주소 안내
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #dbeafe', fontFamily: 'monospace' }}>
                <div><strong>기계실 패널 (00시):</strong> https://spa-guard.vercel.app/?view=panel&time=00시</div>
                <div><strong>기계실 패널 (03시):</strong> https://spa-guard.vercel.app/?view=panel&time=03시</div>
                <div><strong>기계실 패널 (06시):</strong> https://spa-guard.vercel.app/?view=panel&time=06시</div>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                <div><strong>시설 주간 (11번):</strong> https://spa-guard.vercel.app/?nfc=11</div>
                <div><strong>시설 야간 (12번):</strong> https://spa-guard.vercel.app/?nfc=12</div>
                <div><strong>리셉션 오전 (21번):</strong> https://spa-guard.vercel.app/?nfc=21</div>
                <div><strong>리셉션 오후 (22번):</strong> https://spa-guard.vercel.app/?nfc=22</div>
                <div><strong>리셉션 야간 (23번):</strong> https://spa-guard.vercel.app/?nfc=23</div>
                <div><strong>미화 남주 (31번):</strong> https://spa-guard.vercel.app/?nfc=31</div>
                <div><strong>미화 남야 (32번):</strong> https://spa-guard.vercel.app/?nfc=32</div>
                <div><strong>미화 여주 (33번):</strong> https://spa-guard.vercel.app/?nfc=33</div>
                <div><strong>푸드 오픈 (41번):</strong> https://spa-guard.vercel.app/?nfc=41</div>
                <div><strong>푸드 마감 (42번):</strong> https://spa-guard.vercel.app/?nfc=42</div>
                <div><strong>스낵 오픈 (51번):</strong> https://spa-guard.vercel.app/?nfc=51</div>
                <div><strong>스낵 마감 (52번):</strong> https://spa-guard.vercel.app/?nfc=52</div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
