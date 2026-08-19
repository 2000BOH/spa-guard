import React from 'react';
import type { TabId, ItemState, StatusType } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';

interface CheckListViewProps {
  currentTab: TabId;
  itemsState: Record<string, ItemState>;
  summaryText: string;
  onSetStatus: (id: string, status: StatusType) => void;
  onSaveNote: (id: string, note: string) => void;
  onChangeSummary: (summary: string) => void;
}

export const CheckListView: React.FC<CheckListViewProps> = ({
  currentTab,
  itemsState,
  summaryText,
  onSetStatus,
  onSaveNote,
  onChangeSummary
}) => {
  const sections = CHECKLIST_DATA[currentTab] || [];
  const tabNameClean = TAB_INFO[currentTab].htmlName.replace('<br>', ' ').replace('\n', ' ');

  return (
    <main className="main-container">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="section-card">
          <div className="section-title">
            <span>{section.category}</span>
            <span className="badge-count">{section.items.length} 항목</span>
          </div>

          {section.items.map((item) => {
            const state = itemsState[item.id] || { status: null, note: '' };
            const statusClass = state.status === 'normal' 
              ? 'status-normal' 
              : state.status === 'issue' 
                ? 'status-issue' 
                : '';

            return (
              <div key={item.id} className={`slim-item ${statusClass}`}>
                <div 
                  className="slim-row" 
                  onClick={() => onSetStatus(item.id, state.status === 'normal' ? null : 'normal')}
                >
                  <div className="item-left">
                    <span className="dot"></span>
                    <span className="item-text">{item.text}</span>
                  </div>
                  <div className="item-btns" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-toggle btn-normal"
                      onClick={() => onSetStatus(item.id, state.status === 'normal' ? null : 'normal')}
                    >
                      이상무
                    </button>
                    <button 
                      className="btn-toggle btn-issue"
                      onClick={() => onSetStatus(item.id, state.status === 'issue' ? null : 'issue')}
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
                    onChange={(e) => onSaveNote(item.id, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="summary-box">
        <label htmlFor="summaryText">
          📝 <span>{tabNameClean}</span> 종합 의견
        </label>
        <textarea
          id="summaryText"
          placeholder="해당 시설의 특이사항이나 점검 의견을 기재하세요."
          value={summaryText || ''}
          onChange={(e) => onChangeSummary(e.target.value)}
        />
      </div>
    </main>
  );
};
