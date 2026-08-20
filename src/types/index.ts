export type TabId = 'tab1' | 'tab2' | 'tab3' | 'tab4';

export type StatusType = 'normal' | 'issue' | null;

export interface ItemState {
  status?: StatusType;
  note?: string;
  // Tab 4 special fields
  pressure?: number | null; // 1.0 ~ 2.4
  sound?: StatusType;
  leak?: StatusType;
  vibration?: StatusType;
  backwash?: number; // 0: 미실시, 1: 1회 완료, 2: 2회 최종완료
  hairCatcher?: number; // 0: 미실시, 1: 1회 완료, 2: 2회 최종완료
}

export interface TabSummaryState {
  tab1: string;
  tab2: string;
  tab3: string;
  tab4: string;
}

export interface AppState {
  storeName: string;
  date: string;
  inspector: string;
  items: Record<string, ItemState>;
  summaries: TabSummaryState;
  securityCode: string;
  lastModified: string;
}

export interface CheckItem {
  id: string;
  text: string;
  type?: 'filter' | 'pump' | 'general' | string;
}

export interface SectionData {
  category: string;
  items: CheckItem[];
}
