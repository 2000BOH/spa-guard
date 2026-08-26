export type TabId = 'tab1' | 'tab2' | 'tab3' | 'tab4' | 'tab5' | string;

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
  tempDawn?: number | null; // 새벽/야간 온도 (18:00 ~ 05:59)
  tempMorning?: number | null; // 오전 온도 (06:00 ~ 11:59)
  tempAfternoon?: number | null; // 오후 온도 (12:00 ~ 17:59)
}

export interface TabSummaryState {
  [key: string]: string;
}

export interface AppState {
  storeName: string;
  date: string;
  inspector: string;
  roleName?: string;
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

export type DepartmentId = 'facilities' | 'reception' | 'cleaning' | 'food' | 'snack';

/** 개별 담당자 역할 및 이름 */
export interface RoleDef {
  role: string; // 예: '주간', '야간', '오픈', '마감'
  name: string; // 예: '홍길동' (비워둘 수 있음)
}

/** 하위 그룹 (예: 미화 남자/여자) */
export interface PersonnelGroup {
  label?: string;
  roles: RoleDef[];
}

/** 파트별 인원 설정 */
export interface DeptConfig {
  groups: PersonnelGroup[];
  inspectorPool?: string[];
}

export type DeptConfigMap = Record<DepartmentId, DeptConfig>;

export interface AdminSettings {
  defaultTargetTemp: number;       // 기본 기준온도 (예: 10.0)
  defaultBackwashCount: number;    // 역세척 주간 횟수 기준
  hairCatcherMonthlyCount: number; // 헤어캐처 월간 점검 횟수
  deptConfigs: DeptConfigMap;      // 파트별 인원 설정
  enableMachineRoomPanel?: boolean; // 기계실 00/03/06시 패널 기능 활성화 여부
}
