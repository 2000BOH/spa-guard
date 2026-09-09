import type { AdminSettings, DepartmentId, DeptConfigMap, DeptConfig, SectionData } from '../types';
import { NFC_BASE_NUMBERS } from '../types';
import { CHECKLIST_DATA } from '../data/checklistData';
import { saveAdminSettingsToSupabase } from './supabase';

export const DEFAULT_DEPT_CONFIGS: DeptConfigMap = {
  facilities: {
    groups: [{ roles: [{ role: '주간', name: '이수용' }, { role: '야간', name: '김성민' }] }],
    inspectorPool: ['이수용', '김성민']
  },
  reception: {
    groups: [{ roles: [{ role: '오전', name: '차윤미' }, { role: '오후', name: '이정은' }, { role: '야간', name: '이정은' }] }],
    inspectorPool: ['차윤미', '이정은']
  },
  cleaning: {
    groups: [
      { label: '미화', roles: [
        { role: '주간(남)', name: '미화(남)', isWomen: false },
        { role: '야간', name: '미화(야)', isWomen: false },
        { role: '주간(여)', name: '미화(여)', isWomen: true }
      ]}
    ],
    inspectorPool: ['미화팀']
  },
  food: {
    groups: [{ roles: [{ role: '오픈', name: '차윤미' }, { role: '마감', name: '푸드담당' }] }],
    inspectorPool: ['차윤미']
  },
  snack: {
    groups: [{ roles: [{ role: '오픈', name: '이정은' }, { role: '마감', name: '스낵담당' }] }],
    inspectorPool: ['이정은']
  }
};

export interface FlatRoleItem {
  roleLabel: string;
  groupIndex: number;
  roleIndex: number;
  flatIndex: number;
  nfcNum: number;
}

export function getDeptFlatRoles(dept: DepartmentId, deptConfig?: DeptConfig): FlatRoleItem[] {
  const base = NFC_BASE_NUMBERS[dept];
  const config = deptConfig || DEFAULT_DEPT_CONFIGS[dept];
  const items: FlatRoleItem[] = [];
  let idx = 0;

  if (config && config.groups) {
    config.groups.forEach((grp, gIdx) => {
      grp.roles.forEach((r, rIdx) => {
        const label = grp.label ? `${grp.label} ${r.role}` : r.role;
        const finalLabel = (r.isWomen && !label.includes('(여)')) ? `${label} (여)` : label;
        items.push({
          roleLabel: finalLabel,
          groupIndex: gIdx,
          roleIndex: rIdx,
          flatIndex: idx,
          nfcNum: base + idx
        });
        idx++;
      });
    });
  }

  return items;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  defaultTargetTemp: 10.0,
  defaultBackwashCount: 2,
  hairCatcherMonthlyCount: 2,
  deptConfigs: DEFAULT_DEPT_CONFIGS,
  enableMachineRoomPanel: false,
  customChecklists: {}
};

function sanitizeDeptConfigs(configs: DeptConfigMap): DeptConfigMap {
  const cleaned: DeptConfigMap = { ...configs };
  (Object.keys(DEFAULT_DEPT_CONFIGS) as DepartmentId[]).forEach(dept => {
    const defaultConf = DEFAULT_DEPT_CONFIGS[dept];
    const currConf = cleaned[dept];
    if (!currConf || !currConf.groups) {
      cleaned[dept] = defaultConf;
      return;
    }
    
    // Check if any role has multi-name strings like "이수용, 김성민"
    let hasComma = false;
    currConf.groups.forEach(g => {
      g.roles?.forEach(r => {
        if (r.name && r.name.includes(',')) hasComma = true;
      });
    });

    if (hasComma) {
      cleaned[dept] = defaultConf;
    }
  });
  return cleaned;
}

export function loadAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('spa_admin_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      let mergedConfigs: DeptConfigMap = { ...DEFAULT_DEPT_CONFIGS };
      
      if (parsed.deptConfigs) {
        for (const key of Object.keys(DEFAULT_DEPT_CONFIGS) as DepartmentId[]) {
          const pConfig = parsed.deptConfigs[key];
          if (pConfig && pConfig.groups && pConfig.groups[0] && Array.isArray(pConfig.groups[0].roles)) {
            if (key === 'cleaning' && (pConfig.groups.length > 1 || pConfig.groups[0]?.roles?.length !== 3)) {
              mergedConfigs[key] = DEFAULT_DEPT_CONFIGS[key];
            } else {
              mergedConfigs[key] = pConfig;
            }
          }
        }
      }

      mergedConfigs = sanitizeDeptConfigs(mergedConfigs);

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        deptConfigs: mergedConfigs,
        customChecklists: parsed.customChecklists || {}
      };
    }
  } catch {
    // ignore json error
  }
  return DEFAULT_SETTINGS;
}

export function saveAdminSettings(settings: AdminSettings): void {
  try {
    localStorage.setItem('spa_admin_settings', JSON.stringify(settings));
    saveAdminSettingsToSupabase(settings);
  } catch (err) {
    console.error('Failed to save admin settings to localStorage:', err);
  }
}

/**
 * 특정 탭의 체크리스트 데이터 반환 (커스텀 데이터가 있으면 우선 반영)
 */
export function getEffectiveChecklistData(tabId: string, customChecklists?: Record<string, SectionData[]>): SectionData[] {
  if (customChecklists && customChecklists[tabId] && customChecklists[tabId].length > 0) {
    return customChecklists[tabId];
  }
  return (CHECKLIST_DATA[tabId] as SectionData[]) || [];
}
