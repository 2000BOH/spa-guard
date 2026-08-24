import React from 'react';
import type { TabId, ItemState, StatusType, CheckItem } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';
import { loadAdminSettings } from './AdminModal';

interface CheckListViewProps {
  currentTab: TabId;
  itemsState: Record<string, ItemState>;
  summaryText: string;
  isReadOnly: boolean;
  onSetStatus: (id: string, status: StatusType) => void;
  onSaveNote: (id: string, note: string) => void;
  onChangeSummary: (summary: string) => void;
  onUpdateTab4ItemBatch: (id: string, updates: Partial<ItemState>) => void;
}

// Helper: Calculate item-specific historical average pressure across all saved dates in localStorage
function getItemHistoricalAvg(itemId: string, itemsState: Record<string, ItemState>): number | null {
  const dateMap: Record<string, number> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('spa_date_data_')) {
        const dateStr = key.replace('spa_date_data_', '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const val = parsed.items?.[itemId]?.pressure;
          if (typeof val === 'number' && !isNaN(val)) {
            dateMap[dateStr] = val;
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  const currentVal = itemsState[itemId]?.pressure;
  if (typeof currentVal === 'number' && !isNaN(currentVal)) {
    dateMap['__current_memory__'] = currentVal;
  }

  const values = Object.values(dateMap);
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

export const CheckListView: React.FC<CheckListViewProps> = ({
  currentTab,
  itemsState,
  summaryText,
  isReadOnly,
  onSetStatus,
  onSaveNote,
  onChangeSummary,
  onUpdateTab4ItemBatch
}) => {
  const sections = CHECKLIST_DATA[currentTab] || [];
  const tabNameClean = TAB_INFO[currentTab]?.name || '';
  const adminSettings = loadAdminSettings();

  // Pressure options 1.0 to 2.4 (step 0.1)
  const pressureOptions: number[] = [];
  for (let p = 1.0; p <= 2.41; p += 0.1) {
    pressureOptions.push(Math.round(p * 10) / 10);
  }

  // Render Excel Table View for Tab 5 (온도체크)
  if (currentTab === 'tab5') {
    return (
      <main className="main-container">
        <div className="section-card">
          <div className="section-title">
            <span>수온 및 실내 온도 점검표 (시간대별 엑셀 표)</span>
            <span className="badge-count" style={{ color: '#2563eb', fontWeight: 600 }}>
              * 기본 기준온도 10.0℃ (변경 가능)
            </span>
          </div>

          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)', border: '1px solid #cbd5e1' }}>
            <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 20,
                    background: '#e2e8f0',
                    color: '#0f172a',
                    padding: '8px 8px',
                    borderRight: '2px solid #94a3b8',
                    borderBottom: '2px solid #94a3b8',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    width: '1%'
                  }}>
                    구역 / 시설명
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    기준 온도 (℃)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    측정 온도 (자동분류)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderBottom: '2px solid #94a3b8' }}>
                    비고 및 특이사항
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <tr>
                      <td 
                        colSpan={6} 
                        style={{
                          background: '#f8fafc',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#1e293b',
                          padding: '6px 8px',
                          borderBottom: '1px solid #cbd5e1',
                          borderTop: sIdx > 0 ? '2px solid #cbd5e1' : 'none'
                        }}
                      >
                        {section.category}
                      </td>
                    </tr>

                    {section.items.map((item: CheckItem, iIdx) => {
                      const state = itemsState[item.id] || {};
                      // Default all target temperatures to 10.0 ℃ as requested
                      const target = state.targetTemp !== undefined && state.targetTemp !== null ? state.targetTemp : 10.0;
                      const rowBg = iIdx % 2 === 1 ? '#f8fafc' : '#ffffff';

                      const currentHour = new Date().getHours();
                      let currentField: 'tempDawn' | 'tempMorning' | 'tempAfternoon' = 'tempDawn';
                      let currentLabel = '야간';
                      if (currentHour >= 6 && currentHour < 12) {
                        currentField = 'tempMorning';
                        currentLabel = '오전';
                      } else if (currentHour >= 12 && currentHour < 18) {
                        currentField = 'tempAfternoon';
                        currentLabel = '오후';
                      }

                      const renderSingleTempCell = () => {
                        const val = state[currentField] ?? null;
                        let diffText = '';
                        let diffColor = '#6b7280';

                        if (val !== null && target !== null && typeof val === 'number' && typeof target === 'number') {
                          const diff = Math.round((val - target) * 10) / 10;
                          if (diff > 0) {
                            diffText = `+${diff.toFixed(1)}`;
                            diffColor = '#dc2626';
                          } else if (diff < 0) {
                            diffText = `${diff.toFixed(1)}`;
                            diffColor = '#2563eb';
                          } else {
                            diffText = `±0.0`;
                          }
                        }

                        // 이전에 저장된 다른 시간대 값들도 보여주기 위함
                        const history = [];
                        if (currentField !== 'tempDawn' && state.tempDawn) history.push(`야간: ${state.tempDawn}℃`);
                        if (currentField !== 'tempMorning' && state.tempMorning) history.push(`오전: ${state.tempMorning}℃`);
                        if (currentField !== 'tempAfternoon' && state.tempAfternoon) history.push(`오후: ${state.tempAfternoon}℃`);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6' }}>[{currentLabel}]</span>
                              <input 
                                type="number"
                                step="0.1"
                                placeholder="℃"
                                style={{ width: '56px', height: '24px', fontSize: '12px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                value={val ?? ''}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                  const num = e.target.value !== '' ? parseFloat(e.target.value) : null;
                                  onUpdateTab4ItemBatch(item.id, { [currentField]: num });
                                }}
                              />
                              {diffText && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: diffColor }}>
                                  ({diffText})
                                </span>
                              )}
                            </div>
                            {history.length > 0 && (
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {history.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <tr key={item.id} style={{ background: rowBg }}>
                          {/* Column 1: 구역/시설명 */}
                          <td style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            background: rowBg,
                            fontWeight: 600,
                            color: '#1e293b',
                            padding: '6px 8px',
                            borderRight: '2px solid #cbd5e1',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            width: '1%'
                          }}>
                            {item.text}
                          </td>

                          {/* Column 2: 기준 온도 (℃) - 기본값 10.0 ℃ */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>
                            <input 
                              type="number"
                              step="0.1"
                              placeholder="10.0"
                              style={{ width: '54px', height: '23px', fontSize: '11px', textAlign: 'center', fontWeight: 700, borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f1f5f9' }}
                              value={target}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const num = e.target.value !== '' ? parseFloat(e.target.value) : 10.0;
                                onUpdateTab4ItemBatch(item.id, { targetTemp: num });
                              }}
                            />
                          </td>

                          {/* Column 3: 측정 온도 (자동분류) */}
                          <td style={{ padding: '6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {renderSingleTempCell()}
                          </td>

                          {/* Column 4: 비고 및 특이사항 */}
                          <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>
                            <input 
                              type="text"
                              className="slim-note-input"
                              style={{ height: '24px', fontSize: '11px', width: '100%' }}
                              placeholder="온도 이상/특이사항"
                              value={state.note || ''}
                              disabled={isReadOnly}
                              onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 종합 의견 */}
        <div className="summary-box">
          <label htmlFor="summaryText">
            <span>{tabNameClean}</span> 종합 의견 {isReadOnly && '(조회 전용)'}
          </label>
          <textarea
            id="summaryText"
            placeholder="온도 상태의 특이사항이나 관리 의견을 기재하세요."
            value={summaryText || ''}
            disabled={isReadOnly}
            onChange={(e) => !isReadOnly && onChangeSummary(e.target.value)}
          />
        </div>
      </main>
    );
  }

  // Render Excel Table View for Tab 4
  if (currentTab === 'tab4') {
    const tableSections = sections.filter(s => s.items.some((i: CheckItem) => i.type === 'filter' || i.type === 'pump'));
    const generalSections = sections.filter(s => s.items.every((i: CheckItem) => i.type === 'general' || !i.type));

    return (
      <main className="main-container">
        {/* 1. 여과기 및 펌프 엑셀 표 */}
        <div className="section-card">
          <div className="section-title">
            <span>여과기 및 펌프 점검표 (엑셀 표)</span>
            <span className="badge-count" style={{ color: '#2563eb', fontWeight: 600 }}>
              * 각 여과기별 누적 평균 대비 차이 표시
            </span>
          </div>

          {/* Sticky Excel Table Container */}
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)', border: '1px solid #cbd5e1' }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 20,
                    background: '#e2e8f0',
                    color: '#0f172a',
                    padding: '8px 8px',
                    borderRight: '2px solid #94a3b8',
                    borderBottom: '2px solid #94a3b8',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    width: '1%'
                  }}>
                    기기명
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    압력 (bar)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    상태 (소리/누수/진동)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    역세척 (주 {adminSettings.defaultBackwashCount}회)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap', width: '1%' }}>
                    헤어캐처 (월 {adminSettings.hairCatcherMonthlyCount}회)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderBottom: '2px solid #94a3b8' }}>
                    비고 및 특이사항
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableSections.map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <tr>
                      <td 
                        colSpan={6} 
                        style={{
                          background: '#f8fafc',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#1e293b',
                          padding: '6px 8px',
                          borderBottom: '1px solid #cbd5e1',
                          borderTop: sIdx > 0 ? '2px solid #cbd5e1' : 'none'
                        }}
                      >
                        {section.category}
                      </td>
                    </tr>

                    {section.items.map((item: CheckItem, iIdx) => {
                      const state = itemsState[item.id] || {};
                      const isFilter = item.type === 'filter';
                      const isPump = item.type === 'pump';

                      const currentP = state.pressure ?? null;
                      let diffText = '';
                      let diffColor = '#6b7280';
                      let itemAvgVal: number | null = null;

                      if (isFilter && currentP !== null) {
                        itemAvgVal = getItemHistoricalAvg(item.id, itemsState);
                        if (itemAvgVal !== null) {
                          const diff = Math.round((currentP - itemAvgVal) * 10) / 10;
                          if (diff > 0) {
                            diffText = `+${diff.toFixed(1)}`;
                            diffColor = '#dc2626';
                          } else if (diff < 0) {
                            diffText = `${diff.toFixed(1)}`;
                            diffColor = '#2563eb';
                          } else {
                            diffText = `±0.0`;
                          }
                        }
                      }

                      const bw = state.backwash || 0;
                      const hc = state.hairCatcher || 0;
                      const isIssue = state.status === 'issue' || state.sound === 'issue' || state.leak === 'issue' || state.vibration === 'issue';
                      const isNormal = state.status === 'normal' || (state.sound === 'normal' && state.leak === 'normal' && state.vibration === 'normal');

                      const rowBg = iIdx % 2 === 1 ? '#f8fafc' : '#ffffff';

                      return (
                        <tr key={item.id} style={{ background: rowBg }}>
                          {/* Column 1: 기기명 */}
                          <td style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            background: rowBg,
                            fontWeight: 600,
                            color: '#1e293b',
                            padding: '6px 8px',
                            borderRight: '2px solid #cbd5e1',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            width: '1%'
                          }}>
                            {item.text}
                          </td>

                          {/* Column 2: 압력 (bar) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>
                            {isFilter ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <select 
                                  value={currentP ?? ''} 
                                  disabled={isReadOnly}
                                  style={{ fontSize: '11px', padding: '2px 3px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                  onChange={(e) => onUpdateTab4ItemBatch(item.id, { pressure: e.target.value ? parseFloat(e.target.value) : null })}
                                >
                                  <option value="">미선택</option>
                                  {pressureOptions.map(val => (
                                    <option key={val} value={val}>{val.toFixed(1)}</option>
                                  ))}
                                </select>
                                {diffText && (
                                  <span 
                                    title={itemAvgVal !== null ? `${item.text} 누적 평균: ${itemAvgVal.toFixed(1)} bar` : ''}
                                    style={{ fontSize: '10px', fontWeight: 700, color: diffColor, cursor: 'help' }}
                                  >
                                    ({diffText})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Column 3: 상태 (소리/누수/진동) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>
                            <div style={{ display: 'inline-flex', gap: '3px' }}>
                              <button 
                                className={`btn-toggle ${isNormal ? 'btn-normal' : ''}`}
                                disabled={isReadOnly}
                                style={{ height: '23px', fontSize: '11px', padding: '0 6px' }}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  const next = isNormal ? null : 'normal';
                                  onUpdateTab4ItemBatch(item.id, { sound: next, leak: next, vibration: next, status: next });
                                }}
                              >
                                이상무
                              </button>
                              <button 
                                className={`btn-toggle ${isIssue ? 'btn-issue' : ''}`}
                                disabled={isReadOnly}
                                style={{ height: '23px', fontSize: '11px', padding: '0 6px' }}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  const next = isIssue ? null : 'issue';
                                  onUpdateTab4ItemBatch(item.id, { sound: next, leak: next, vibration: next, status: next });
                                }}
                              >
                                이상
                              </button>
                            </div>
                          </td>

                          {/* Column 4: 역세척 (주 2회) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>
                            {isFilter ? (
                              <button 
                                disabled={isReadOnly}
                                style={{
                                  height: '23px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '0 6px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: bw === 2 ? '#10b981' : bw === 1 ? '#3b82f6' : '#e2e8f0',
                                  color: bw > 0 ? '#fff' : '#64748b'
                                }}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  const nextBw = (bw + 1) % 3;
                                  onUpdateTab4ItemBatch(item.id, { backwash: nextBw });
                                }}
                              >
                                {bw === 2 ? '2회 최종완료' : bw === 1 ? '1회 완료' : '미실시'}
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Column 5: 헤어캐처 (2주 1회) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>
                            {isFilter || isPump ? (
                              <button 
                                disabled={isReadOnly}
                                style={{
                                  height: '23px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '0 6px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: hc === 2 ? '#059669' : hc === 1 ? '#3b82f6' : '#e2e8f0',
                                  color: hc > 0 ? '#fff' : '#64748b'
                                }}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  const nextHc = (hc + 1) % 3;
                                  onUpdateTab4ItemBatch(item.id, { hairCatcher: nextHc });
                                }}
                              >
                                {hc === 2 ? '2회 완료(등록)' : hc === 1 ? '1회 완료' : '미실시'}
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* Column 6: 비고 및 특이사항 */}
                          <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0' }}>
                            <input 
                              type="text"
                              className="slim-note-input"
                              style={{ height: '24px', fontSize: '11px', width: '100%' }}
                              placeholder="특이사항 기재"
                              value={state.note || ''}
                              disabled={isReadOnly}
                              onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. 기타설비 점검 */}
        {generalSections.map((section, gIdx) => (
          <div key={gIdx} className="section-card" style={{ marginTop: '10px' }}>
            <div className="section-title">
              <span>{section.category}</span>
              <span className="badge-count">{section.items.length} 항목</span>
            </div>

            {section.items.map((item: CheckItem) => {
              const state = itemsState[item.id] || {};
              const statusClass = state.status === 'normal' 
                ? 'status-normal' 
                : state.status === 'issue' 
                  ? 'status-issue' 
                  : '';

              return (
                <div key={item.id} className={`slim-item ${statusClass}`}>
                  <div 
                    className="slim-row" 
                    onClick={() => {
                      if (!isReadOnly) {
                        onSetStatus(item.id, state.status === 'normal' ? null : 'normal');
                      }
                    }}
                  >
                    <div className="item-left">
                      <span className="dot"></span>
                      <span className="item-text">{item.text}</span>
                    </div>
                    <div className="item-btns" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-toggle btn-normal"
                        disabled={isReadOnly}
                        onClick={() => !isReadOnly && onSetStatus(item.id, state.status === 'normal' ? null : 'normal')}
                      >
                        이상무
                      </button>
                      <button 
                        className="btn-toggle btn-issue"
                        disabled={isReadOnly}
                        onClick={() => !isReadOnly && onSetStatus(item.id, state.status === 'issue' ? null : 'issue')}
                      >
                        이상
                      </button>
                    </div>
                  </div>

                  <div className={`slim-note-box ${state.status === 'issue' ? 'show' : ''}`}>
                    <input 
                      type="text" 
                      className="slim-note-input"
                      placeholder="⚠️ 이상 내용 입력" 
                      value={state.note || ''}
                      disabled={isReadOnly}
                      onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 종합 의견 */}
        <div className="summary-box">
          <label htmlFor="summaryText">
            <span>{tabNameClean}</span> 종합 의견 {isReadOnly && '(조회 전용)'}
          </label>
          <textarea
            id="summaryText"
            placeholder="해당 시설의 특이사항이나 점검 의견을 기재하세요."
            value={summaryText || ''}
            disabled={isReadOnly}
            onChange={(e) => !isReadOnly && onChangeSummary(e.target.value)}
          />
        </div>
      </main>
    );
  }

  // Standard View for Tabs 1, 2, 3
  return (
    <main className="main-container">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="section-card">
          <div className="section-title">
            <span>{section.category}</span>
            <span className="badge-count">{section.items.length} 항목</span>
          </div>

          {section.items.map((item: CheckItem) => {
            const state = itemsState[item.id] || {};
            const statusClass = state.status === 'normal' 
              ? 'status-normal' 
              : state.status === 'issue' 
                ? 'status-issue' 
                : '';

            return (
              <div key={item.id} className={`slim-item ${statusClass}`}>
                <div 
                  className="slim-row" 
                  onClick={() => {
                    if (!isReadOnly) {
                      onSetStatus(item.id, state.status === 'normal' ? null : 'normal');
                    }
                  }}
                >
                  <div className="item-left">
                    <span className="dot"></span>
                    <span className="item-text">{item.text}</span>
                  </div>
                  <div className="item-btns" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-toggle btn-normal"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && onSetStatus(item.id, state.status === 'normal' ? null : 'normal')}
                    >
                      이상무
                    </button>
                    <button 
                      className="btn-toggle btn-issue"
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && onSetStatus(item.id, state.status === 'issue' ? null : 'issue')}
                    >
                      이상
                    </button>
                  </div>
                </div>

                <div className={`slim-note-box ${state.status === 'issue' ? 'show' : ''}`}>
                  <input 
                    type="text" 
                    className="slim-note-input"
                    placeholder="⚠️ 이상 내용 입력" 
                    value={state.note || ''}
                    disabled={isReadOnly}
                    onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="summary-box">
        <label htmlFor="summaryText">
          <span>{tabNameClean}</span> 종합 의견 {isReadOnly && '(조회 전용)'}
        </label>
        <textarea
          id="summaryText"
          placeholder="해당 시설의 특이사항이나 점검 의견을 기재하세요."
          value={summaryText || ''}
          disabled={isReadOnly}
          onChange={(e) => !isReadOnly && onChangeSummary(e.target.value)}
        />
      </div>
    </main>
  );
};
