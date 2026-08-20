export type TabId = 'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5';

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
  
  // Tab 5 Temperature Check special fields
  targetTemp?: number | null; // 기준온도 (℃)
  tempDawn?: number | null; // 새벽 온도
  tempMorning?: number | null; // 오전 온도
  tempAfternoon?: number | null; // 오후 온도
}

export interface TabSummaryState {
  tab1: string;
  tab2: string;
  tab3: string;
  tab4: string;
  tab5: string;
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
  type?: 'filter' | 'pump' | 'general' | 'temp' | string;
}

export interface SectionData {
  category: string;
  items: CheckItem[];
}
