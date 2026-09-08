import React, { useState, useEffect } from 'react';
import type { DepartmentId, SectionData, CheckItem } from '../types';
import { DEPT_TABS_MAP, TAB_INFO } from '../data/checklistData';
import { loadAdminSettings, saveAdminSettings, getEffectiveChecklistData } from '../lib/adminSettings';

interface ChecklistEditorPageProps {
  dept: DepartmentId;
  isDirectAccess?: boolean; // 91~95번 NFC 주소로 직접 접속했는지 여부
  onBackToAdmin?: () => void;
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

export const ChecklistEditorPage: React.FC<ChecklistEditorPageProps> = ({
  dept,
  isDirectAccess = false,
  onBackToAdmin
}) => {
  const availableTabs = DEPT_TABS_MAP[dept] || [];
  const [editingTabId, setEditingTabId] = useState<string>(availableTabs[0] || '');
  const [customChecklists, setCustomChecklists] = useState<Record<string, SectionData[]>>({});
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [draggedItemInfo, setDraggedItemInfo] = useState<{ secIdx: number; itemIdx: number } | null>(null);

  useEffect(() => {
    const settings = loadAdminSettings();
    setCustomChecklists(settings.customChecklists || {});
  }, []);

  useEffect(() => {
    const tabs = DEPT_TABS_MAP[dept] || [];
    if (tabs.length > 0 && (!editingTabId || !tabs.includes(editingTabId))) {
      setEditingTabId(tabs[0]);
    }
  }, [dept, editingTabId]);

  const getCurrentSections = (): SectionData[] => {
    return getEffectiveChecklistData(editingTabId, customChecklists);
  };

  const updateTabSections = (newSections: SectionData[]) => {
    const nextCustoms = { ...customChecklists, [editingTabId]: newSections };
    setCustomChecklists(nextCustoms);

    const settings = loadAdminSettings();
    saveAdminSettings({
      ...settings,
      customChecklists: nextCustoms
    });
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

  const handleResetTab = () => {
    const tabName = TAB_INFO[editingTabId]?.name || editingTabId;
    if (!confirm(`'${tabName}' 탭의 체크리스트를 원본 기본값으로 복원하시겠습니까?`)) return;

    const nextCustoms = { ...customChecklists };
    delete nextCustoms[editingTabId];
    setCustomChecklists(nextCustoms);

    const settings = loadAdminSettings();
    saveAdminSettings({
      ...settings,
      customChecklists: nextCustoms
    });
  };

  const currentSections = getCurrentSections();

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '16px 12px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* 상단 네비게이션 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: '#1e293b', padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{DEPT_ICONS[dept]}</span>
              <span>{DEPT_LABELS[dept]} 체크리스트 편집기</span>
            </div>
            {isDirectAccess && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                🔒 [팀장 전용] 담당 파트 독립 관리 모드 (다른 페이지 이동 불가)
              </div>
            )}
          </div>

          {!isDirectAccess && onBackToAdmin && (
            <button
              onClick={onBackToAdmin}
              style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ← 관리자 설정
            </button>
          )}
        </div>

        {/* 탭 이동 선택 바 */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
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
                  padding: '8px 14px', fontSize: '13px', fontWeight: 700, borderRadius: '20px',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  background: isSelected ? '#38bdf8' : '#1e293b',
                  color: isSelected ? '#0f172a' : '#94a3b8',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {info?.name || tabId}
                {hasCustom && <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>수정됨</span>}
              </button>
            );
          })}
        </div>

        {/* 바 기능: 원본 복원 & 카테고리 추가 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
            📌 {TAB_INFO[editingTabId]?.name || editingTabId} 탭 점검 목록
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {customChecklists[editingTabId] && (
              <button
                type="button"
                onClick={handleResetTab}
                style={{ background: '#7f1d1d', color: '#fecca3', border: '1px solid #991b1b', fontSize: '11px', padding: '5px 10px', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 원본 복원
              </button>
            )}
            <button
              type="button"
              onClick={handleAddCategory}
              style={{ background: '#0284c7', color: '#fff', border: 'none', fontSize: '11px', padding: '5px 10px', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}
            >
              + 카테고리 추가
            </button>
          </div>
        </div>

        {/* 카테고리별 세부 항목 편집기 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentSections.map((sec, secIdx) => (
            <div key={secIdx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
                  {sec.category}
                </span>
              </div>

              {/* 항목 리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {sec.items.map((item: CheckItem, itemIdx: number) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedItemInfo({ secIdx, itemIdx })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropItem(secIdx, itemIdx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a',
                      border: '1px solid #334155', borderRadius: '6px', padding: '8px 10px'
                    }}
                  >
                    {/* 드래그 핸들 */}
                    <span style={{ cursor: 'grab', color: '#64748b', fontSize: '16px', userSelect: 'none' }} title="드래그하여 순서 변경">
                      ☰
                    </span>

                    {/* ▲ / ▼ 순서 변경 버튼 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        type="button"
                        disabled={itemIdx === 0}
                        onClick={() => handleMoveItem(secIdx, itemIdx, 'up')}
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: itemIdx === 0 ? '#334155' : '#94a3b8', cursor: itemIdx === 0 ? 'default' : 'pointer' }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={itemIdx === sec.items.length - 1}
                        onClick={() => handleMoveItem(secIdx, itemIdx, 'down')}
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: itemIdx === sec.items.length - 1 ? '#334155' : '#94a3b8', cursor: itemIdx === sec.items.length - 1 ? 'default' : 'pointer' }}
                      >
                        ▼
                      </button>
                    </div>

                    {/* 개별 순번 번호 */}
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', minWidth: '22px', textAlign: 'right' }}>
                      {itemIdx + 1}.
                    </span>

                    {/* 항목 인라인 텍스트 수정 */}
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateItemText(secIdx, itemIdx, e.target.value)}
                      style={{ flex: 1, border: '1px solid #334155', borderRadius: '5px', padding: '6px 10px', fontSize: '13px', color: '#f8fafc', background: '#1e293b' }}
                    />

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(secIdx, itemIdx)}
                      style={{
                        background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px',
                        padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                ))}
              </div>

              {/* 개별 카테고리 맨 하단 + 항목 추가 입력 폼 */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #334155' }}>
                <input
                  type="text"
                  placeholder={`'${sec.category}' 구역에 추가할 점검 항목 입력...`}
                  value={newItemTexts[secIdx] || ''}
                  onChange={(e) => setNewItemTexts({ ...newItemTexts, [secIdx]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem(secIdx)}
                  style={{ flex: 1, border: '1px solid #0284c7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', background: '#0f172a', color: '#fff' }}
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(secIdx)}
                  style={{
                    background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px',
                    padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  + 항목 추가
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
