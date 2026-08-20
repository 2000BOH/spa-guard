import React from 'react';
import type { TabId, ItemState, StatusType, CheckItem } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';

interface CheckListViewProps {
  currentTab: TabId;
  itemsState: Record<string, ItemState>;
  summaryText: string;
  isReadOnly: boolean;
  onSetStatus: (id: string, status: StatusType) => void;
  onSaveNote: (id: string, note: string) => void;
  onChangeSummary: (summary: string) => void;
  onUpdateTab4Item: (id: string, field: keyof ItemState, value: any) => void;
}

export const CheckListView: React.FC<CheckListViewProps> = ({
  currentTab,
  itemsState,
  summaryText,
  isReadOnly,
  onSetStatus,
  onSaveNote,
  onChangeSummary,
  onUpdateTab4Item
}) => {
  const sections = CHECKLIST_DATA[currentTab] || [];
  const tabNameClean = TAB_INFO[currentTab].htmlName.replace('<br>', ' ').replace('\n', ' ');

  // Calculate Average Pressure for Tab 4 Filters
  let pressureSum = 0;
  let pressureCount = 0;
  if (currentTab === 'tab4') {
    Object.keys(itemsState).forEach((key) => {
      if (key.startsWith('tab4_f')) {
        const val = itemsState[key]?.pressure;
        if (typeof val === 'number' && !isNaN(val)) {
          pressureSum += val;
          pressureCount++;
        }
      }
    });
  }
  const avgPressure = pressureCount > 0 ? (pressureSum / pressureCount) : null;

  // Pressure options 1.0 to 2.4 (step 0.1)
  const pressureOptions: number[] = [];
  for (let p = 1.0; p <= 2.41; p += 0.1) {
    pressureOptions.push(Math.round(p * 10) / 10);
  }

  // Render Excel Table View for Tab 4
  if (currentTab === 'tab4') {
    // Separate table sections (filter, pump) and general sections
    const tableSections = sections.filter(s => s.items.some((i: CheckItem) => i.type === 'filter' || i.type === 'pump'));
    const generalSections = sections.filter(s => s.items.every((i: CheckItem) => i.type === 'general' || !i.type));

    return (
      <main className="main-container">
        {/* 1. 여과기 및 펌프 엑셀 표 */}
        <div className="section-card">
          <div className="section-title">
            <span>여과기 및 펌프 점검표 (엑셀 표)</span>
            {avgPressure !== null && (
              <span className="badge-count" style={{ color: '#2563eb', fontWeight: 700 }}>
                여과기 평균 압력: {avgPressure.toFixed(1)} bar
              </span>
            )}
          </div>

          {/* Sticky Excel Table Container */}
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)', border: '1px solid #cbd5e1' }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px' }}>
              <thead>
                <tr>
                  {/* Column A: Tight width fit for 기기명 */}
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
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', minWidth: '100px' }}>
                    압력 (bar)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', minWidth: '115px' }}>
                    상태 (소리/누수/진동)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', minWidth: '115px' }}>
                    역세척 (주 2회)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8', minWidth: '130px' }}>
                    헤어캐처 (2주 1회)
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', color: '#334155', padding: '8px 6px', borderBottom: '2px solid #94a3b8', minWidth: '150px' }}>
                    비고 및 특이사항
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableSections.map((section, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {/* Category Header Row */}
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
                      if (isFilter && currentP !== null && avgPressure !== null) {
                        const diff = Math.round((currentP - avgPressure) * 10) / 10;
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

                      const bw = state.backwash || 0;
                      const hc = state.hairCatcher || 0;
                      const isIssue = state.sound === 'issue' || state.leak === 'issue' || state.vibration === 'issue';
                      const isNormal = state.sound === 'normal' && state.leak === 'normal' && state.vibration === 'normal';

                      const rowBg = iIdx % 2 === 1 ? '#f8fafc' : '#ffffff';

                      return (
                        <tr key={item.id} style={{ background: rowBg }}>
                          {/* Sticky Left Column: 기기 명칭 (글자폭 딱맞춤) */}
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

                          {/* 압력 (bar) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                            {isFilter ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <select 
                                  value={currentP ?? ''} 
                                  disabled={isReadOnly}
                                  style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                  onChange={(e) => onUpdateTab4Item(item.id, 'pressure', e.target.value ? parseFloat(e.target.value) : null)}
                                >
                                  <option value="">미선택</option>
                                  {pressureOptions.map(val => (
                                    <option key={val} value={val}>{val.toFixed(1)}</option>
                                  ))}
                                </select>
                                {diffText && (
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: diffColor }}>
                                    ({diffText})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* 상태 (소리/누수/진동) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button 
                                className={`btn-toggle ${isNormal ? 'btn-normal' : ''}`}
                                disabled={isReadOnly}
                                style={{ height: '23px', fontSize: '11px', padding: '0 6px' }}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  const next = isNormal ? null : 'normal';
                                  onUpdateTab4Item(item.id, 'sound', next);
                                  onUpdateTab4Item(item.id, 'leak', next);
                                  onUpdateTab4Item(item.id, 'vibration', next);
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
                                  onUpdateTab4Item(item.id, 'sound', 'issue');
                                }}
                              >
                                이상
                              </button>
                            </div>
                          </td>

                          {/* 역세척 (주 2회) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
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
                                  onUpdateTab4Item(item.id, 'backwash', nextBw);
                                }}
                              >
                                {bw === 2 ? '2회 최종완료' : bw === 1 ? '1회 완료' : '미실시'}
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* 헤어캐처 (2주 1회) */}
                          <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
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
                                  onUpdateTab4Item(item.id, 'hairCatcher', nextHc);
                                }}
                              >
                                {hc === 2 ? '2회 완료(등록)' : hc === 1 ? '1회 완료' : '미실시'}
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>

                          {/* 비고 및 특이사항 */}
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

        {/* 2. 기타설비 점검 (일반 카드 항목으로 표에서 밖으로 이동) */}
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
