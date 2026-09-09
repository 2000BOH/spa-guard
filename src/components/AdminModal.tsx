import React, { useState, useEffect, useRef } from 'react';
import MachineRoomPanel from './MachineRoomPanel';
import { ChecklistEditorPage } from './ChecklistEditorPage';
import type { AdminSettings, DepartmentId } from '../types';
import { NFC_BASE_NUMBERS, NFC_EDIT_NUMBERS } from '../types';
import {
  DEFAULT_DEPT_CONFIGS,
  DEFAULT_SETTINGS,
  loadAdminSettings,
  saveAdminSettings
} from '../lib/adminSettings';

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

const LINKS = [
  { label: '시설 점검리스트 (91번)', url: 'https://spa-guard.vercel.app/?nfc=91' },
  { label: '리셉션 점검리스트 (92번)', url: 'https://spa-guard.vercel.app/?nfc=92' },
  { label: '미화 점검리스트 (93번)', url: 'https://spa-guard.vercel.app/?nfc=93' },
  { label: '푸드 점검리스트 (94번)', url: 'https://spa-guard.vercel.app/?nfc=94' },
  { label: '스낵 점검리스트 (95번)', url: 'https://spa-guard.vercel.app/?nfc=95' },
  null,
  { label: '기계실 패널 (00시)', url: 'https://spa-guard.vercel.app/?view=panel&time=00시' },
  { label: '기계실 패널 (03시)', url: 'https://spa-guard.vercel.app/?view=panel&time=03시' },
  { label: '기계실 패널 (06시)', url: 'https://spa-guard.vercel.app/?view=panel&time=06시' },
  null,
  { label: '시설 주간 (11번)', url: 'https://spa-guard.vercel.app/?nfc=11' },
  { label: '시설 야간 (12번)', url: 'https://spa-guard.vercel.app/?nfc=12' },
  { label: '리셉션 오전 (21번)', url: 'https://spa-guard.vercel.app/?nfc=21' },
  { label: '리셉션 오후 (22번)', url: 'https://spa-guard.vercel.app/?nfc=22' },
  { label: '리셉션 야간 (23번)', url: 'https://spa-guard.vercel.app/?nfc=23' },
  { label: '미화 남주 (31번)', url: 'https://spa-guard.vercel.app/?nfc=31' },
  { label: '미화 남야 (32번)', url: 'https://spa-guard.vercel.app/?nfc=32' },
  { label: '미화 여주 (33번)', url: 'https://spa-guard.vercel.app/?nfc=33' },
  { label: '푸드 오픈 (41번)', url: 'https://spa-guard.vercel.app/?nfc=41' },
  { label: '푸드 마감 (42번)', url: 'https://spa-guard.vercel.app/?nfc=42' },
  { label: '스낵 오픈 (51번)', url: 'https://spa-guard.vercel.app/?nfc=51' },
  { label: '스낵 마감 (52번)', url: 'https://spa-guard.vercel.app/?nfc=52' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="주소 복사"
      style={{
        background: copied ? '#22c55e' : '#e2e8f0',
        border: 'none', borderRadius: '4px', padding: '2px 7px',
        fontSize: '10px', fontWeight: 700, cursor: 'pointer',
        color: copied ? '#fff' : '#475569', flexShrink: 0
      }}
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  );
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [showPannelEditor, setShowPannelEditor] = useState(false);
  const [editingDeptPage, setEditingDeptPage] = useState<DepartmentId | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deptIsWomenInputs, setDeptIsWomenInputs] = useState<Record<DepartmentId, boolean[]>>({
    facilities: [false], reception: [false], cleaning: [false], food: [false], snack: [false]
  });
  const [deptIsNightInputs, setDeptIsNightInputs] = useState<Record<DepartmentId, boolean[]>>({
    facilities: [false], reception: [false], cleaning: [false], food: [false], snack: [false]
  });
  const [deptInspectorInputs, setDeptInspectorInputs] = useState<Record<DepartmentId, string[]>>({
    facilities: [''], reception: [''], cleaning: [''], food: [''], snack: ['']
  });

  useEffect(() => {
    if (isOpen) {
      skipAutoSaveRef.current = true;
      setShowPannelEditor(false);
      setEditingDeptPage(null);
      const loadedSettings = loadAdminSettings();
      setSettings(loadedSettings);

      const initialInputs: Record<DepartmentId, string[]> = {
        facilities: [], reception: [], cleaning: [], food: [], snack: []
      };
      const initialWomenInputs: Record<DepartmentId, boolean[]> = {
        facilities: [], reception: [], cleaning: [], food: [], snack: []
      };
      const initialNightInputs: Record<DepartmentId, boolean[]> = {
        facilities: [], reception: [], cleaning: [], food: [], snack: []
      };

      (Object.keys(DEPT_LABELS) as DepartmentId[]).forEach(dept => {
        const deptConfig = loadedSettings.deptConfigs[dept];
        const namesSet = new Set<string>();

        if (deptConfig?.inspectorPool) {
          deptConfig.inspectorPool.forEach(p => {
            p.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
          });
        } else {
          deptConfig?.groups?.forEach(grp => {
            grp.roles?.forEach(r => {
              if (r.names && r.names.length > 0) {
                r.names.forEach(n => n.trim() && namesSet.add(n.trim()));
              } else if (r.name) {
                r.name.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
              }
            });
          });
        }

        const list = Array.from(namesSet);
        initialInputs[dept] = list.length > 0 ? list : [''];

        let womenFlags = deptConfig?.womenPool || [];
        let nightFlags = deptConfig?.nightPool || [];
        while (womenFlags.length < list.length) womenFlags.push(false);
        while (nightFlags.length < list.length) nightFlags.push(false);
        initialWomenInputs[dept] = womenFlags.length > 0 ? womenFlags : [false];
        initialNightInputs[dept] = nightFlags.length > 0 ? nightFlags : [false];
      });

      setDeptInspectorInputs(initialInputs);
      setDeptIsWomenInputs(initialWomenInputs);
      setDeptIsNightInputs(initialNightInputs);

      // 초기 로드 완료 후 자동저장 허용
      setTimeout(() => { skipAutoSaveRef.current = false; }, 100);
    } else {
      skipAutoSaveRef.current = true;
    }
  }, [isOpen]);

  // 설정 변경 시 자동 저장 (800ms 디바운스)
  useEffect(() => {
    if (skipAutoSaveRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveAdminSettings(settings);
    }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [settings]);

  if (!isOpen) return null;

  if (editingDeptPage) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10000, overflowY: 'auto' }}>
        <ChecklistEditorPage
          dept={editingDeptPage}
          isDirectAccess={false}
          onBackToAdmin={() => setEditingDeptPage(null)}
        />
      </div>
    );
  }

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

  const updateDeptNamesList = (dept: DepartmentId, newList: string[], newWomenList?: boolean[], newNightList?: boolean[]) => {
    const cleaned = newList.length > 0 ? newList : [''];
    setDeptInspectorInputs(prev => ({ ...prev, [dept]: cleaned }));
    if (newWomenList) setDeptIsWomenInputs(prev => ({ ...prev, [dept]: newWomenList.length > 0 ? newWomenList : [false] }));
    if (newNightList) setDeptIsNightInputs(prev => ({ ...prev, [dept]: newNightList.length > 0 ? newNightList : [false] }));

    const validNames = cleaned.map(n => n.trim()).filter(Boolean);
    const validWomen = newWomenList || deptIsWomenInputs[dept] || [];
    const validNight = newNightList || deptIsNightInputs[dept] || [];
    const newConfigs = { ...settings.deptConfigs };
    const deptConf = { ...newConfigs[dept] };
    const groups = JSON.parse(JSON.stringify(deptConf.groups || DEFAULT_DEPT_CONFIGS[dept].groups));

    let idx = 0;
    groups.forEach((grp: any) => {
      grp.roles?.forEach((r: any) => {
        const assignedName = validNames[idx] || (idx === 0 && validNames.length > 0 ? validNames[0] : '');
        r.name = assignedName;
        r.names = validNames;
        idx++;
      });
    });

    deptConf.groups = groups;
    deptConf.inspectorPool = validNames;
    if (dept === 'cleaning') {
      deptConf.womenPool = validWomen.slice(0, validNames.length);
      deptConf.nightPool = validNight.slice(0, validNames.length);
    }
    newConfigs[dept] = deptConf;

    setSettings(prev => ({ ...prev, deptConfigs: newConfigs }));
  };

  const addDeptInspectorInput = (dept: DepartmentId) => {
    const currentList = deptInspectorInputs[dept] || [''];
    const currentWomen = deptIsWomenInputs[dept] || [false];
    const currentNight = deptIsNightInputs[dept] || [false];
    updateDeptNamesList(dept, [...currentList, ''], [...currentWomen, false], [...currentNight, false]);
  };

  const removeDeptInspectorInput = (dept: DepartmentId, nameIdx: number) => {
    const currentList = deptInspectorInputs[dept] || [''];
    const currentWomen = deptIsWomenInputs[dept] || [false];
    const currentNight = deptIsNightInputs[dept] || [false];
    const updated = currentList.filter((_, idx) => idx !== nameIdx);
    const updatedWomen = currentWomen.filter((_, idx) => idx !== nameIdx);
    const updatedNight = currentNight.filter((_, idx) => idx !== nameIdx);
    updateDeptNamesList(dept, updated.length > 0 ? updated : [''], updatedWomen.length > 0 ? updatedWomen : [false], updatedNight.length > 0 ? updatedNight : [false]);
  };

  const changeDeptInspectorName = (dept: DepartmentId, nameIdx: number, val: string) => {
    const currentList = [...(deptInspectorInputs[dept] || [''])];
    currentList[nameIdx] = val;
    updateDeptNamesList(dept, currentList, deptIsWomenInputs[dept], deptIsNightInputs[dept]);
  };

  const changeDeptIsWomen = (dept: DepartmentId, nameIdx: number, checked: boolean) => {
    const currentWomen = [...(deptIsWomenInputs[dept] || [false])];
    currentWomen[nameIdx] = checked;
    updateDeptNamesList(dept, deptInspectorInputs[dept], currentWomen, deptIsNightInputs[dept]);
  };

  const changeDeptIsNight = (dept: DepartmentId, nameIdx: number, checked: boolean) => {
    const currentNight = [...(deptIsNightInputs[dept] || [false])];
    currentNight[nameIdx] = checked;
    updateDeptNamesList(dept, deptInspectorInputs[dept], deptIsWomenInputs[dept], currentNight);
  };

  const inputStyle: React.CSSProperties = { width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '10px' };

  const renderDeptEditor = (dept: DepartmentId) => {
    const nameList = deptInspectorInputs[dept] || [''];
    const womenList = deptIsWomenInputs[dept] || [];

    return (
      <div key={dept} style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            {DEPT_LABELS[dept]} 파트 담당자
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nameList.map((nameVal, nIdx) => (
            <div key={nIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                placeholder={`${DEPT_LABELS[dept]} 담당자 이름 (예: 홍길동)`}
                value={nameVal}
                onChange={(e) => changeDeptInspectorName(dept, nIdx, e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  border: (dept === 'cleaning' && !!womenList[nIdx]) ? '2px solid #ef4444' : inputStyle.border
                }}
              />
              {dept === 'cleaning' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#334155' }}>
                    <input type="checkbox" checked={!!womenList[nIdx]} onChange={(e) => changeDeptIsWomen(dept, nIdx, e.target.checked)} />
                    여자
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#334155' }}>
                    <input type="checkbox" checked={!!(deptIsNightInputs[dept] || [])[nIdx]} onChange={(e) => changeDeptIsNight(dept, nIdx, e.target.checked)} />
                    야간
                  </label>
                </div>
              )}
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', width: '92%', maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>⚙️ 관리자 설정</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '6px 0' }}>

          {/* ── 파트별 체크리스트 편집 버튼 ── */}
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
            📋 파트별 체크리스트 목록 편집 (팀장 전용 관리)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((deptKey) => (
              <button
                key={deptKey}
                onClick={() => setEditingDeptPage(deptKey)}
                style={{
                  height: '46px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <span>{DEPT_LABELS[deptKey]}</span>
                <span style={{ fontSize: '9px', color: '#bae6fd', fontWeight: 500 }}>점검 리스트</span>
              </button>
            ))}
          </div>

          {/* ── 기계실 패널 설정 ── */}
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
            ⚙️ 기계실 패널 편집
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
              <span>⚙️</span> 기계실 패널 설정 편집
            </button>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
              버튼 위치 등 기준값을 설정합니다. 점검자는 메인화면에서 시간을 선택하여 확인합니다.
            </div>
          </div>

          {/* ── 점검 기준값 ── */}
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
            📏 점검 기준값
          </h4>

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

          {/* ── 파트별 지정 담당자 ── */}
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
            👥 파트별 지정 담당자
          </h4>

          {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((dept) => renderDeptEditor(dept))}

          {/* 자동저장 안내 */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '8px', marginBottom: '16px' }}>
            ✅ 변경사항은 자동으로 저장됩니다
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => {
                const data = localStorage.getItem('spa_admin_settings');
                if (data) {
                  navigator.clipboard.writeText(data).then(() => alert('✅ 설정 데이터가 복사되었습니다.\n크롬 브라우저를 열고 [설정 데이터 가져오기]를 눌러 붙여넣으세요.'));
                } else {
                  alert('저장된 설정이 없습니다.');
                }
              }}
              style={{
                flex: 1, height: '36px', background: '#f1f5f9', color: '#475569',
                fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer'
              }}
            >
              📤 설정 데이터 복사하기 (내보내기)
            </button>
            <button
              onClick={() => {
                const data = prompt('복사한 설정 데이터를 아래에 붙여넣어주세요:');
                if (data) {
                  try {
                    JSON.parse(data);
                    localStorage.setItem('spa_admin_settings', data);
                    alert('✅ 설정이 정상적으로 적용되었습니다. 창을 새로고침합니다.');
                    window.location.reload();
                  } catch {
                    alert('데이터 형식이 올바르지 않습니다.');
                  }
                }
              }}
              style={{
                flex: 1, height: '36px', background: '#f1f5f9', color: '#475569',
                fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer'
              }}
            >
              📥 설정 데이터 가져오기 (붙여넣기)
            </button>
          </div>

          {/* ── 바로가기 주소 (접기/펼치기) ── */}
          <button
            onClick={() => setShowLinks(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
              padding: '10px 14px', cursor: 'pointer', marginBottom: showLinks ? '0' : '14px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>🔗 바로가기 주소</span>
            <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 700 }}>{showLinks ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>

          {showLinks && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {LINKS.map((item, i) =>
                  item === null ? (
                    <hr key={i} style={{ border: 'none', borderTop: '1px solid #dbeafe', margin: '2px 0' }} />
                  ) : (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '6px 8px', borderRadius: '5px', border: '1px solid #dbeafe' }}>
                      <span style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: 600, minWidth: '130px', flexShrink: 0 }}>{item.label}</span>
                      <span style={{ fontSize: '10px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.url}</span>
                      <CopyButton text={item.url} />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
