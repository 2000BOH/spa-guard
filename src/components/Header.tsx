import React from 'react';
import type { TabId } from '../types';
import { TAB_INFO } from '../data/checklistData';

interface HeaderProps {
  currentTab: TabId;
  onSelectTab: (tabId: TabId) => void;
  progressPct: number;
  onBack: () => void;
  departmentName: string;
  availableTabs: TabId[];
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  progressPct,
  onBack,
  departmentName,
  availableTabs,
  children
}) => {
  return (
    <header className="app-header">
      {/* 1. 최상단 타이틀 행 */}
      <div className="header-row">
        <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '0 4px', marginRight: '4px' }}>
            ←
          </button>
          <img src="/logo.png" alt="Blue Ocean Wellness Spa Logo" className="header-logo-img" />
          <span>{departmentName} 점검일지</span>
        </div>
        <div className="header-btns">
          <span className="save-badge">저장됨</span>
        </div>
      </div>

      {/* 2. 날짜, 점검자, 통계 메타바 행 (제목 바로 밑) */}
      {children}
      
      {/* 3. 시설 Ⅰ ~ Ⅳ 탭 선택 행 (날짜 라인 아래) */}
      <nav className="tab-nav">
        {availableTabs.map((tabId) => (
          <button
            key={tabId}
            className={`tab-btn ${currentTab === tabId ? 'active' : ''}`}
            onClick={() => onSelectTab(tabId)}
          >
            <span dangerouslySetInnerHTML={{ __html: TAB_INFO[tabId].htmlName.replace('\n', ' ') }} />
          </button>
        ))}
      </nav>

      {/* 4. 진행률 바 */}
      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
      </div>
    </header>
  );
};
