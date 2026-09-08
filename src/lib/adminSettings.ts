import type { AdminSettings, DepartmentId, DeptConfigMap, DeptConfig } from '../types';
import { NFC_BASE_NUMBERS } from '../types';

export const DEFAULT_DEPT_CONFIGS: DeptConfigMap = {
  facilities: {
    groups: [{ roles: [{ role: '주간', name: '' }, { role: '야간', name: '' }] }]
  },
  reception: {
    groups: [{ roles: [{ role: '오전', name: '' }, { role: '오후', name: '' }, { role: '야간', name: '' }] }]
  },
  cleaning: {
    groups: [
      { label: '미화', roles: [
        { role: '주간(남)', name: '', isWomen: false },
        { role: '야간', name: '', isWomen: false },
        { role: '주간(여)', name: '', isWomen: true }
      ]}
    ]
  },
  food: {
    groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }]
  },
  snack: {
    groups: [{ roles: [{ role: '오픈', name: '' }, { role: '마감', name: '' }] }]
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
  enableMachineRoomPanel: false
};

export function loadAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('spa_admin_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const mergedConfigs: DeptConfigMap = { ...DEFAULT_DEPT_CONFIGS };
      
      if (parsed.deptConfigs) {
        for (const key of Object.keys(DEFAULT_DEPT_CONFIGS) as DepartmentId[]) {
          const pConfig = parsed.deptConfigs[key];
          if (pConfig && pConfig.groups && pConfig.groups[0] && Array.isArray(pConfig.groups[0].roles)) {
            // Legacy format check for cleaning
            if (key === 'cleaning' && (pConfig.groups.length > 1 || pConfig.groups[0]?.roles?.length !== 3)) {
              mergedConfigs[key] = DEFAULT_DEPT_CONFIGS[key];
            } else {
              mergedConfigs[key] = pConfig;
            }
          }
        }
      }

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        deptConfigs: mergedConfigs
      };
    }
  } catch {
    // ignore json error
  }
  return DEFAULT_SETTINGS;
}
