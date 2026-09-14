import React, { useState, useEffect } from "react";
import type { AdminSettings, DepartmentId, HandoverItem, AppState } from "../types";
import { getDeptFlatRoles } from "../lib/adminSettings";
import { getDeptTabs, TAB_INFO } from "../data/checklistData";
import { fetchInspectionFromSupabase, saveInspectionToSupabase, fetchFutureInspectionsFromSupabase } from "../lib/supabase";

interface HandoverModalProps {
  onClose: () => void;
  adminSettings: AdminSettings;
}

const DEPT_NAMES: Record<DepartmentId, string> = {
  facilities: "시설 점검 리스트",
  reception: "리셉션 점검 리스트",
  cleaning: "미화 점검 리스트",
  food: "푸드 점검 리스트",
  snack: "스낵 점검 리스트"
};

const getStorageKey = (date: string) => `spa_date_data_${date}`;
const getTodayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const HandoverModal: React.FC<HandoverModalProps> = ({ onClose, adminSettings }) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set());

  // Load data when dept or role changes
  useEffect(() => {
    if (!selectedDept || !selectedRole) return;
    const tabs = getDeptTabs(selectedDept, selectedRole);
    if (tabs.length > 1 && !selectedTab) return; // Wait for tab selection
    
    const currentTab = tabs.length > 1 ? selectedTab : tabs[0];

    const loadData = async () => {
      setIsLoading(true);
      const key = currentTab ? `${selectedDept}_${selectedRole}_${currentTab}` : `${selectedDept}_${selectedRole}`;
      const todayStr = getTodayStr();
      
      const res = await fetchFutureInspectionsFromSupabase(todayStr, "블루오션 웰니스 스파");
      const allItems: HandoverItem[] = [];
      const datesWithData = new Set<string>();

      if (res.success && res.logs) {
        for (const log of res.logs) {
          if (log.handovers && log.handovers[key]) {
            const itemsForDate = log.handovers[key].map((i: any) => ({
              ...i,
              targetDate: log.check_date
            }));
            allItems.push(...itemsForDate);
            datesWithData.add(log.check_date);
          }
        }
      }

      setItems(allItems);
      setLoadedDates(datesWithData);
      setIsLoading(false);
    };

    loadData();
  }, [selectedDept, selectedRole, selectedTab]);

  const handleAddItem = () => {
    setItems(prev => [...prev, { 
      id: `ho_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
      text: "", 
      status: "none",
      targetDate: getTodayStr()
    }]);
  };

  const handleUpdateItemText = (id: string, text: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleUpdateItemDate = (id: string, targetDate: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, targetDate } : item));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!selectedDept || !selectedRole) return;
    setIsLoading(true);
    
    // Clean empty items
    const cleanItems = items.filter(i => i.text.trim() !== "" && i.targetDate);

    const tabs = getDeptTabs(selectedDept, selectedRole);
    const currentTab = tabs.length > 1 ? selectedTab : tabs[0];
    const key = currentTab ? `${selectedDept}_${selectedRole}_${currentTab}` : `${selectedDept}_${selectedRole}`;
    
    // Determine all dates we need to update
    const datesToUpdate = new Set(loadedDates);
    cleanItems.forEach(i => datesToUpdate.add(i.targetDate!));

    for (const date of datesToUpdate) {
      let baseState: AppState = {
        storeName: "블루오션 웰니스 스파",
        date: date,
        inspector: "관리자",
        items: {},
        summaries: { tab1: "", tab2: "", tab3: "", tab4: "", tab5: "" },
        handovers: {},
        securityCode: "",
        lastModified: new Date().toISOString()
      };

      const res = await fetchInspectionFromSupabase(date);
      if (res.success && res.log) {
        baseState = { ...baseState, ...res.log, handovers: res.log.handovers || {} };
      } else {
        const raw = localStorage.getItem(getStorageKey(date));
        if (raw) {
          const parsed = JSON.parse(raw);
          baseState = { ...baseState, ...parsed, handovers: parsed.handovers || {} };
        }
      }

      const itemsForThisDate = cleanItems.filter(i => i.targetDate === date);
      // Remove targetDate before saving, as it is implicit in the date record
      const itemsToSave = itemsForThisDate.map(({ targetDate, ...rest }) => rest);
      
      baseState.handovers[key] = itemsToSave as HandoverItem[];
      baseState.lastModified = new Date().toISOString();

      try {
        localStorage.setItem(getStorageKey(date), JSON.stringify(baseState));
      } catch (e) {
        console.error(e);
      }

      await saveInspectionToSupabase(baseState);
    }
    
    setIsLoading(false);
    alert("인수인계 사항이 성공적으로 저장되었습니다.");
    onClose();
  };

  return (
    <div className="modal-overlay open">
      <div className="modal-content admin-modal" style={{ maxWidth: "700px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
            📝 인수인계 및 관리자 지시사항
          </h2>
          <button onClick={onClose} className="btn-close" style={{ fontSize: "24px", color: "#64748b" }}>×</button>
        </div>

        {!selectedDept ? (
          <div>
            <p style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#475569", fontWeight: 600 }}>부서를 선택하세요:</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {(Object.keys(DEPT_NAMES) as DepartmentId[]).map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  style={{
                    background: "#0284c7", color: "white", padding: "16px", borderRadius: "12px",
                    border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "bold",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    transition: "transform 0.1s"
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {DEPT_NAMES[dept]}
                </button>
              ))}
            </div>
          </div>
        ) : !selectedRole ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
              <button onClick={() => setSelectedDept(null)} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "14px", color: "#475569", fontWeight: 600 }}>← 부서 재선택</button>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>{DEPT_NAMES[selectedDept]} - 담당자 선택</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {getDeptFlatRoles(selectedDept, adminSettings.deptConfigs[selectedDept]).map((role, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedRole(role.roleLabel)}
                  style={{
                    background: "white", color: "#334155", padding: "16px", borderRadius: "12px",
                    border: "2px solid #e2e8f0", cursor: "pointer", fontSize: "15px", fontWeight: 700,
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                    transition: "all 0.2s",
                    textAlign: "left"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#0ea5e9"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                >
                  {role.roleLabel}
                </button>
              ))}
            </div>
          </div>
        ) : (getDeptTabs(selectedDept, selectedRole).length > 1 && !selectedTab) ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
              <button onClick={() => setSelectedRole(null)} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "14px", color: "#475569", fontWeight: 600 }}>← 담당자 재선택</button>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>{DEPT_NAMES[selectedDept]} &gt; {selectedRole} - 구역 선택</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {getDeptTabs(selectedDept, selectedRole).map(tabId => (
                <button
                  key={tabId}
                  onClick={() => setSelectedTab(tabId)}
                  style={{
                    background: "white", color: "#334155", padding: "16px", borderRadius: "12px",
                    border: "2px solid #e2e8f0", cursor: "pointer", fontSize: "15px", fontWeight: 700,
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                    transition: "all 0.2s",
                    textAlign: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#0ea5e9"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                >
                  {TAB_INFO[tabId]?.name || tabId}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "600px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={() => getDeptTabs(selectedDept, selectedRole).length > 1 ? setSelectedTab(null) : setSelectedRole(null)} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "14px", color: "#475569", fontWeight: 600 }}>← 돌아가기</button>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0ea5e9", fontWeight: 800 }}>
                  {DEPT_NAMES[selectedDept]} &gt; {selectedRole}
                  {getDeptTabs(selectedDept, selectedRole).length > 1 && selectedTab ? ` > ${TAB_INFO[selectedTab]?.name}` : ""}
                </h3>
              </div>
            </div>
            
            <div style={{ flex: 1, minHeight: "300px", background: "#f8fafc", padding: "16px", borderRadius: "12px", overflowY: "auto" }}>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b", fontSize: "16px" }}>🔄 데이터를 불러오는 중...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: "16px" }}>
                  등록된 인수인계 사항이 없습니다.<br/>아래 <strong>+ 항목 추가</strong> 버튼을 눌러 새 지시사항을 작성하세요.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {items.map((item, idx) => (
                    <div key={item.id} style={{ 
                      display: "flex", gap: "12px", alignItems: "flex-start",
                      background: "white", padding: "16px", borderRadius: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0"
                    }}>
                      <span style={{ fontWeight: 800, color: "#0ea5e9", fontSize: "16px", marginTop: "8px" }}>{idx + 1}.</span>
                      <textarea
                        value={item.text}
                        onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                        placeholder="지시사항을 상세히 입력하세요..."
                        style={{ 
                          flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", 
                          resize: "vertical", minHeight: "80px", fontSize: "15px", lineHeight: "1.5",
                          outline: "none", backgroundColor: "#fcfcfc"
                        }}
                        onFocus={e => e.target.style.borderColor = "#0ea5e9"}
                        onBlur={e => e.target.style.borderColor = "#cbd5e1"}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "130px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>적용 날짜</span>
                          <input 
                            type="date"
                            value={item.targetDate || getTodayStr()}
                            onChange={(e) => handleUpdateItemDate(item.id, e.target.value)}
                            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                          />
                        </div>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ 
                            padding: "8px", background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", 
                            borderRadius: "6px", cursor: "pointer", fontWeight: 600, display: "flex", 
                            alignItems: "center", justifyItems: "center", gap: "4px", marginTop: "auto"
                          }}
                        >
                          <span>🗑️</span> 삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button 
                onClick={handleAddItem}
                style={{ 
                  padding: "12px 20px", background: "#10b981", color: "white", border: "none", 
                  borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "15px",
                  boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)"
                }}
              >
                + 항목 추가
              </button>
              <button 
                onClick={handleSave}
                disabled={isLoading}
                style={{ 
                  padding: "12px 32px", background: "#0ea5e9", color: "white", border: "none", 
                  borderRadius: "8px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "16px",
                  opacity: isLoading ? 0.7 : 1, boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.2)"
                }}
              >
                {isLoading ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
