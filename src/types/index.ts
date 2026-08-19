export type TabId = 'tab1' | 'tab2' | 'tab3' | 'tab4';

export type StatusType = 'normal' | 'issue' | null;

export interface ItemState {
  status: StatusType;
  note: string;
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
}

export interface SectionData {
  category: string;
  items: CheckItem[];
}
