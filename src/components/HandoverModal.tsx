import React, { useState, useEffect } from 'react';
import type { AdminSettings, DepartmentId, HandoverItem, AppState } from '../types';
import { getDeptFlatRoles } from '../lib/adminSettings';
import { fetchInspectionFromSupabase, saveInspectionToSupabase } from '../lib/supabase';

interface HandoverModalProps {
  onClose: () => void;
  adminSettings: AdminSettings;
}

const DEPT_NAMES: Record<DepartmentId, string> = {
  facilities: '시설 점검 리스트',
  reception: '리셉션 점검 리스트',
  cleaning: '미화 점검 리스트',
  food: '푸드 점검 리스트',
  snack: '스낵 점검 리스트'
};

const getStorageKey = (date: string) => `spa_date_data_${date}`;

export const HandoverModal: React.FC<HandoverModalProps> = ({ onClose, adminSettings }) => {
  const [targetDate, setTargetDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when date, dept, or role changes
  useEffect(() => {
    if (!selectedDept || !selectedRole) return;
    const loadData = async () => {
      setIsLoading(true);
      const key = `${selectedDept}_${selectedRole}`;
      let loadedState: AppState | null = null;
      
      const res = await fetchInspectionFromSupabase(targetDate);
      if (res.success && res.log) {
        loadedState = {
          storeName: res.log.store_name,
          date: res.log.check_date,
          inspector: res.log.inspector,
          items: res.log.items_state,
          summaries: res.log.summaries,
          handovers: res.log.handovers || {},
          securityCode: res.log.security_code,
          lastModified: res.log.recorded_at
        };
      } else {
        const raw = localStorage.getItem(getStorageKey(targetDate));
        if (raw) {
          loadedState = JSON.parse(raw);
        }
      }

      if (loadedState && loadedState.handovers && loadedState.handovers[key]) {
        setItems(loadedState.handovers[key]);
      } else {
        setItems([]);
      }
      setIsLoading(false);
    };

    loadData();
  }, [targetDate, selectedDept, selectedRole]);

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: `ho_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, text: '', status: 'none' }]);
  };

  const handleUpdateItemText = (id: string, text: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!selectedDept || !selectedRole) return;
    setIsLoading(true);
    
    // Clean empty items
    const cleanItems = items.filter(i => i.text.trim() !== '');

    const key = `${selectedDept}_${selectedRole}`;
    let baseState: AppState = {
      storeName: '블루오션 웰니스 스파',
      date: targetDate,
      inspector: '관리자',
      items: {},
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '', tab5: '' },
      handovers: {},
      securityCode: '',
      lastModified: new Date().toISOString()
    };

    const res = await fetchInspectionFromSupabase(targetDate);
    if (res.success && res.log) {
      baseState = { ...baseState, ...res.log, handovers: res.log.handovers || {} };
    } else {
      const raw = localStorage.getItem(getStorageKey(targetDate));
      if (raw) {
        const parsed = JSON.parse(raw);
        baseState = { ...baseState, ...parsed, handovers: parsed.handovers || {} };
      }
    }

    baseState.handovers[key] = cleanItems;
    baseState.lastModified = new Date().toISOString();

    try {
      localStorage.setItem(getStorageKey(targetDate), JSON.stringify(baseState));
    } catch (e) {
      console.error(e);
    }

    await saveInspectionToSupabase(baseState);
    
    setIsLoading(false);
    alert('인수인계 사항이 저장되었습니다.');
  };

  return (
    <div className="modal-overlay open">
      <div className="modal-content admin-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 인수인계 및 관리자 지시사항
          </h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>지시사항 적용 날짜:</span>
          <input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
        </div>

        {!selectedDept ? (
          <div>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', fontWeight: 600 }}>부서를 선택하세요:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {(Object.keys(DEPT_NAMES) as DepartmentId[]).map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  style={{
                    background: '#0284c7', color: 'white', padding: '16px', borderRadius: '8px',
                    border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
                  }}
                >
                  {DEPT_NAMES[dept]}
                </button>
              ))}
            </div>
          </div>
        ) : !selectedRole ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
              <button onClick={() => setSelectedDept(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#0ea5e9' }}>← 부서 재선택</button>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{DEPT_NAMES[selectedDept]} - 역할 선택</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {getDeptFlatRoles(selectedDept, adminSettings.deptConfigs[selectedDept]).map((role, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedRole(role.roleLabel)}
                  style={{
                    background: '#f1f5f9', color: '#334155', padding: '12px', borderRadius: '6px',
                    border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '14px', fontWeight: 600
                  }}
                >
                  {role.roleLabel}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setSelectedRole(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#0ea5e9' }}>← 역할 재선택</button>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{DEPT_NAMES[selectedDept]} &gt; {selectedRole}</h3>
              </div>
            </div>
            
            <div style={{ flex: 1, minHeight: '300px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>데이터를 불러오는 중...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  등록된 인수인계 사항이 없습니다.<br/>아래 버튼을 눌러 추가하세요.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, color: '#0ea5e9', paddingTop: '6px' }}>{idx + 1}.</span>
                      <textarea
                        value={item.text}
                        onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                        placeholder="지시사항을 입력하세요..."
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '40px' }}
                      />
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        style={{ padding: '6px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button 
                onClick={handleAddItem}
                style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                + 항목 추가
              </button>
              <button 
                onClick={handleSave}
                disabled={isLoading}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
