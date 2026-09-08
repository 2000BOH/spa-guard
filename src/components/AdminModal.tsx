import React, { useState, useEffect } from 'react';
import MachineRoomPanel from './MachineRoomPanel';
import type { AdminSettings, DepartmentId, SectionData, CheckItem } from '../types';
import { NFC_BASE_NUMBERS } from '../types';
import { DEPT_TABS_MAP, TAB_INFO } from '../data/checklistData';
import {
  DEFAULT_DEPT_CONFIGS,
  DEFAULT_SETTINGS,
  loadAdminSettings,
  saveAdminSettings,
  getEffectiveChecklistData
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

const DEPT_ICONS: Record<DepartmentId, string> = {
  facilities: '🛠️',
  reception: '🛎️',
  cleaning: '🧹',
  food: '🍚',
  snack: '🍜'
};

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [showPannelEditor, setShowPannelEditor] = useState(false);
  const [adminTab, setAdminTab] = useState<'settings' | 'checklists'>('settings');

  // 체크리스트 편집 관련 state
  const [editingDept, setEditingDept] = useState<DepartmentId>('facilities');
  const [editingTabId, setEditingTabId] = useState<string>('tab1');
  const [customChecklists, setCustomChecklists] = useState<Record<string, SectionData[]>>({});
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ secIdx: number; itemIdx: number } | null>(null);

  // 파트(부서)별 통합 담당자 이름 목록 state
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
      setShowPannelEditor(false);
      const loadedSettings = loadAdminSettings();
      setSettings(loadedSettings);
      setCustomChecklists(loadedSettings.customChecklists || {});

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
    const finalSettings: AdminSettings = {
      ...settings,
      customChecklists
    };
    saveAdminSettings(finalSettings);
    alert('✅ 관리자 설정이 저장되었습니다. 창을 새로고침하여 적용합니다.');
    window.location.reload();
  };

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
        const assignedName = validNames[idx] || validNames[0] || '';
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

  // ── 체크리스트 커스텀 조작 로직 ──
  const getCurrentSections = (): SectionData[] => {
    return getEffectiveChecklistData(editingTabId, customChecklists);
  };

  const updateTabSections = (newSections: SectionData[]) => {
    const nextCustoms = { ...customChecklists, [editingTabId]: newSections };
    setCustomChecklists(nextCustoms);
  };

  const handleAddItem = (secIdx: number) => {
    const text = (newItemTexts[secIdx] || '').trim();
    if (!text) {
      alert('추가할 항목 문구를 입력해주세요.');
      return;
    }
    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    if (!sections[secIdx]) return;

    const newId = `c_${editingTabId}_${secIdx}_${Date.now()}`;
    sections[secIdx].items.push({ id: newId, text });

    updateTabSections(sections);
    setNewItemTexts(prev => ({ ...prev, [secIdx]: '' }));
  };

  const handleDeleteItem = (secIdx: number, itemIdx: number) => {
    if (!confirm('해당 체크리스트 항목을 삭제하시겠습니까?')) return;
    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    if (!sections[secIdx] || !sections[secIdx].items[itemIdx]) return;

    sections[secIdx].items.splice(itemIdx, 1);
    updateTabSections(sections);
  };

  const handleMoveItem = (secIdx: number, itemIdx: number, dir: 'up' | 'down') => {
    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    if (!sections[secIdx]) return;
    const items = sections[secIdx].items;
    const targetIdx = dir === 'up' ? itemIdx - 1 : itemIdx + 1;

    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[itemIdx];
    items[itemIdx] = items[targetIdx];
    items[targetIdx] = temp;

    updateTabSections(sections);
  };

  const handleDropItem = (secIdx: number, dropIdx: number) => {
    if (!draggedItemInfo || draggedItemInfo.secIdx !== secIdx) return;
    const dragIdx = draggedItemInfo.itemIdx;
    if (dragIdx === dropIdx) return;

    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    if (!sections[secIdx]) return;
    const items = sections[secIdx].items;

    const [movedItem] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, movedItem);

    updateTabSections(sections);
    setDraggedItemInfo(null);
  };

  const handleUpdateItemText = (secIdx: number, itemIdx: number, newText: string) => {
    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    if (!sections[secIdx] || !sections[secIdx].items[itemIdx]) return;

    sections[secIdx].items[itemIdx].text = newText;
    updateTabSections(sections);
  };

  const handleAddCategory = () => {
    const categoryName = prompt('새 카테고리(그룹) 이름을 입력해주세요:\n(예: ◆ 4. 신규 구역 점검)');
    if (!categoryName || !categoryName.trim()) return;

    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    sections.push({ category: categoryName.trim(), items: [] });
    updateTabSections(sections);
  };

  const handleDeleteCategory = (secIdx: number) => {
    if (!confirm('이 카테고리와 내부의 모든 체크 항목을 함께 삭제하시겠습니까?')) return;
    const sections = JSON.parse(JSON.stringify(getCurrentSections())) as SectionData[];
    sections.splice(secIdx, 1);
    updateTabSections(sections);
  };

  const handleResetTab = () => {
    const tabName = TAB_INFO[editingTabId]?.name || editingTabId;
    if (!confirm(`'${tabName}' 탭의 체크리스트를 원래 기본 원본으로 복원하시겠습니까?`)) return;

    const nextCustoms = { ...customChecklists };
    delete nextCustoms[editingTabId];
    setCustomChecklists(nextCustoms);
  };

  const handleDeptSelect = (dept: DepartmentId) => {
    setEditingDept(dept);
    const availableTabs = DEPT_TABS_MAP[dept] || [];
    if (availableTabs.length > 0) {
      setEditingTabId(availableTabs[0]);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '3px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '10px' };

  const renderDeptEditor = (dept: DepartmentId) => {
    const nameList = deptInspectorInputs[dept] || [''];
    const womenList = deptIsWomenInputs[dept] || [];

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

  const renderChecklistEditor = () => {
    const availableTabs = DEPT_TABS_MAP[editingDept] || [];
    const currentSections = getCurrentSections();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 파트 선택 버튼들 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            1. 수정할 파트(부서) 선택:
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(Object.keys(DEPT_LABELS) as DepartmentId[]).map((deptKey) => {
              const isSelected = editingDept === deptKey;
              return (
                <button
                  key={deptKey}
                  type="button"
                  onClick={() => handleDeptSelect(deptKey)}
                  style={{
                    flex: 1, minWidth: '60px', padding: '8px 4px', fontSize: '12px', fontWeight: 700,
                    borderRadius: '6px', cursor: 'pointer',
                    background: isSelected ? '#2563eb' : '#f1f5f9',
                    color: isSelected ? '#fff' : '#334155',
                    border: isSelected ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
                  }}
                >
                  {DEPT_ICONS[deptKey]} {DEPT_LABELS[deptKey]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 파트 세부 탭 선택들 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            2. 상세 체크리스트 탭 선택:
          </div>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {availableTabs.map((tabId) => {
              const info = TAB_INFO[tabId];
              const isSelected = editingTabId === tabId;
              const hasCustom = !!customChecklists[tabId];

              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setEditingTabId(tabId)}
                  style={{
                    padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '20px',
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    background: isSelected ? '#0f172a' : '#f8fafc',
                    color: isSelected ? '#fff' : '#475569',
                    border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {info?.name || tabId}
                  {hasCustom && <span style={{ fontSize: '9px', background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>커스텀</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 복원 & 카테고리 추가 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>
            📋 {TAB_INFO[editingTabId]?.name || editingTabId} 항목 편집
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {customChecklists[editingTabId] && (
              <button
                type="button"
                onClick={handleResetTab}
                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 원본 복원
              </button>
            )}
            <button
              type="button"
              onClick={handleAddCategory}
              style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
            >
              + 카테고리 추가
            </button>
          </div>
        </div>

        {/* 카테고리별 체크리스트 세부 편집 목록 */}
        {currentSections.map((sec, secIdx) => (
          <div key={secIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {sec.category}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(secIdx)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                그룹 삭제
              </button>
            </div>

            {/* 항목 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              {sec.items.map((item: CheckItem, itemIdx: number) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedItemInfo({ secIdx, itemIdx })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropItem(secIdx, itemIdx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px'
                  }}
                >
                  {/* 드래그 핸들 */}
                  <span style={{ cursor: 'grab', color: '#94a3b8', fontSize: '14px', paddingRight: '2px', userSelect: 'none' }} title="드래그하여 순서 변경">
                    ☰
                  </span>

                  {/* 순서 변경 버튼 ▲ ▼ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <button
                      type="button"
                      disabled={itemIdx === 0}
                      onClick={() => handleMoveItem(secIdx, itemIdx, 'up')}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '9px', color: itemIdx === 0 ? '#cbd5e1' : '#475569', cursor: itemIdx === 0 ? 'default' : 'pointer' }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={itemIdx === sec.items.length - 1}
                      onClick={() => handleMoveItem(secIdx, itemIdx, 'down')}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '9px', color: itemIdx === sec.items.length - 1 ? '#cbd5e1' : '#475569', cursor: itemIdx === sec.items.length - 1 ? 'default' : 'pointer' }}
                    >
                      ▼
                    </button>
                  </div>

                  {/* 텍스트 인라인 수정 */}
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItemText(secIdx, itemIdx, e.target.value)}
                    style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: '#0f172a', background: '#fff' }}
                  />

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(secIdx, itemIdx)}
                    style={{
                      background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px',
                      padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    🗑️ 삭제
                  </button>
                </div>
              ))}
            </div>

            {/* 개별 파트(카테고리) 맨 하단 + 항목 추가 입력 폼 */}
            <div style={{ display: 'flex', gap: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
              <input
                type="text"
                placeholder={`'${sec.category}' 구역에 추가할 점검 항목 입력...`}
                value={newItemTexts[secIdx] || ''}
                onChange={(e) => setNewItemTexts({ ...newItemTexts, [secIdx]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem(secIdx)}
                style={{ flex: 1, border: '1px solid #93c5fd', borderRadius: '5px', padding: '6px 8px', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={() => handleAddItem(secIdx)}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px',
                  padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                + 항목 추가
              </button>
            </div>
          </div>
        ))}
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

        {/* 상단 메인 탭 선택 바 */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '14px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setAdminTab('settings')}
            style={{
              flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: adminTab === 'settings' ? '#fff' : '#f8fafc',
              color: adminTab === 'settings' ? '#2563eb' : '#64748b',
              borderBottom: adminTab === 'settings' ? '3px solid #2563eb' : 'none'
            }}
          >
            👥 파트별 인원 및 기준 설정
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('checklists')}
            style={{
              flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: adminTab === 'checklists' ? '#fff' : '#f8fafc',
              color: adminTab === 'checklists' ? '#2563eb' : '#64748b',
              borderBottom: adminTab === 'checklists' ? '3px solid #2563eb' : 'none'
            }}
          >
            📋 파트별 체크리스트 목록 수정
          </button>
        </div>

        {adminTab === 'settings' ? (
          <div style={{ padding: '4px 0' }}>
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
          </div>
        ) : (
          /* 📋 파트별 체크리스트 목록 수정 탭 */
          renderChecklistEditor()
        )}

        {/* 저장 및 복사/가져오기 버튼 */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', height: '44px', background: '#2563eb', color: '#fff',
            fontSize: '15px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '16px', marginBottom: '8px'
          }}
        >
          💾 모든 설정 및 체크리스트 변경사항 저장
        </button>

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
  );
};
