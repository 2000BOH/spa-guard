import React from 'react';
import type { TabId } from '../types';
import { TAB_INFO } from '../data/checklistData';

interface HeaderProps {
  currentTab: TabId;
  onSelectTab: (tabId: TabId) => void;
  progressPct: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  progressPct
}) => {
  return (
    <header className="app-header">
      <div className="header-row">
        <div className="app-title">
          <img src="/logo.png" alt="Blue Ocean Wellness Spa Logo" className="header-logo-img" />
          <span>시설관리 점검일지</span>
        </div>
        <div className="header-btns">
          <span className="save-badge">저장됨</span>
        </div>
      </div>
      
      <nav className="tab-nav">
        {(Object.keys(TAB_INFO) as TabId[]).map((tabId) => (
          <button
            key={tabId}
            className={`tab-btn ${currentTab === tabId ? 'active' : ''}`}
            onClick={() => onSelectTab(tabId)}
          >
            <span dangerouslySetInnerHTML={{ __html: TAB_INFO[tabId].htmlName.replace('\n', ' ') }} />
          </button>
        ))}
      </nav>

      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
      </div>
    </header>
  );
};
