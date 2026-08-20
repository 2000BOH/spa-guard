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

            // Render Tab 4 Filter Item (Matrix row)
            if (item.type === 'filter') {
              const currentP = state.pressure ?? null;
              let diffText = '';
              let diffColor = '#6b7280';
              if (currentP !== null && avgPressure !== null) {
                const diff = Math.round((currentP - avgPressure) * 10) / 10;
                if (diff > 0) {
                  diffText = `+${diff.toFixed(1)}`;
                  diffColor = '#dc2626'; // Red for higher pressure
                } else if (diff < 0) {
                  diffText = `${diff.toFixed(1)}`;
                  diffColor = '#2563eb'; // Blue for lower pressure
                } else {
                  diffText = `±0.0`;
                }
              }

              const bw = state.backwash || 0;
              const hc = state.hairCatcher || 0;

              return (
                <div key={item.id} className="slim-item" style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{item.text}</span>
                    {avgPressure !== null && (
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        평균: {avgPressure.toFixed(1)}bar
                      </span>
                    )}
                  </div>

                  {/* Matrix Control Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', fontSize: '11px' }}>
                    {/* 압력 셀렉터 */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>📊 압력 (bar)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    </div>

                    {/* 소리 / 누수 / 진동 */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>🔊/💧/📳 상태</div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button 
                          className={`btn-toggle ${state.sound === 'normal' && state.leak === 'normal' && state.vibration === 'normal' ? 'btn-normal' : ''}`}
                          disabled={isReadOnly}
                          style={{ height: '22px', fontSize: '10px', padding: '0 4px' }}
                          onClick={() => {
                            if (isReadOnly) return;
                            const isAllNormal = state.sound === 'normal' && state.leak === 'normal' && state.vibration === 'normal';
                            const next = isAllNormal ? null : 'normal';
                            onUpdateTab4Item(item.id, 'sound', next);
                            onUpdateTab4Item(item.id, 'leak', next);
                            onUpdateTab4Item(item.id, 'vibration', next);
                          }}
                        >
                          전체정상
                        </button>
                        <button 
                          className={`btn-toggle ${state.sound === 'issue' || state.leak === 'issue' || state.vibration === 'issue' ? 'btn-issue' : ''}`}
                          disabled={isReadOnly}
                          style={{ height: '22px', fontSize: '10px', padding: '0 4px' }}
                          onClick={() => {
                            if (isReadOnly) return;
                            onUpdateTab4Item(item.id, 'sound', 'issue');
                          }}
                        >
                          이상
                        </button>
                      </div>
                    </div>

                    {/* 역세척 (주 2회) */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>🔄 역세척 (주2회)</div>
                      <button 
                        disabled={isReadOnly}
                        style={{
                          height: '22px',
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
                        {bw === 2 ? '✅ 2회 최종완료' : bw === 1 ? '🔵 1회 완료' : '⚪ 미실시'}
                      </button>
                    </div>

                    {/* 헤어캐처 (2주 1회) */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>🧹 헤어캐처 (2주1회)</div>
                      <button 
                        disabled={isReadOnly}
                        style={{
                          height: '22px',
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
                        {hc === 2 ? '✅ 2회 완료 (등록!)' : hc === 1 ? '🔵 1회 완료' : '⚪ 미실시'}
                      </button>
                    </div>
                  </div>

                  {/* 메모/특이사항 */}
                  <div style={{ marginTop: '6px' }}>
                    <input 
                      type="text"
                      className="slim-note-input"
                      style={{ height: '26px', fontSize: '11px' }}
                      placeholder="⚠️ 특이사항 및 내용 기재"
                      value={state.note || ''}
                      disabled={isReadOnly}
                      onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            }

            // Render Tab 4 Pump Item
            if (item.type === 'pump') {
              const hc = state.hairCatcher || 0;
              const isIssue = state.sound === 'issue' || state.leak === 'issue' || state.vibration === 'issue';
              const isNormal = state.sound === 'normal' && state.leak === 'normal' && state.vibration === 'normal';

              return (
                <div key={item.id} className="slim-item" style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{item.text}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', fontSize: '11px' }}>
                    {/* 상태 (소리/누수/진동) */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>🔊/💧/📳 소리·누수·진동</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className={`btn-toggle ${isNormal ? 'btn-normal' : ''}`}
                          disabled={isReadOnly}
                          style={{ height: '24px', fontSize: '11px' }}
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
                          style={{ height: '24px', fontSize: '11px' }}
                          onClick={() => {
                            if (isReadOnly) return;
                            onUpdateTab4Item(item.id, 'sound', 'issue');
                          }}
                        >
                          이상
                        </button>
                      </div>
                    </div>

                    {/* 헤어캐처 (2주 1회) */}
                    <div style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>🧹 헤어캐처 (2주1회)</div>
                      <button 
                        disabled={isReadOnly}
                        style={{
                          height: '24px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '0 8px',
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
                        {hc === 2 ? '✅ 2회 완료 (등록!)' : hc === 1 ? '🔵 1회 완료' : '⚪ 미실시'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '6px' }}>
                    <input 
                      type="text"
                      className="slim-note-input"
                      style={{ height: '26px', fontSize: '11px' }}
                      placeholder="⚠️ 특이사항 및 내용 기재"
                      value={state.note || ''}
                      disabled={isReadOnly}
                      onChange={(e) => !isReadOnly && onSaveNote(item.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            }

            // Standard Item (Tabs 1-3 & Tab 4 General)
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
          📝 <span>{tabNameClean}</span> 종합 의견 {isReadOnly && '(조회 전용)'}
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
