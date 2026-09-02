import type { DepartmentId, InspectionStatus } from '../types';

export interface DeptStatusInfo {
  status: InspectionStatus;
  inspector: string;
}

export function getDeptStatusStorageKey(date: string): string {
  return `spa_dept_status_${date}`;
}

export function getDeptInspectionStatus(date: string, dept: DepartmentId, roleName?: string): DeptStatusInfo {
  try {
    const key = getDeptStatusStorageKey(date);
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      const subKey = `${dept}_${roleName || '기본'}`;
      if (data[subKey]) {
        return data[subKey];
      }
    }
  } catch (e) {
    console.error(e);
  }
  return { status: 'none', inspector: '' };
}

export function updateDeptInspectionStatus(
  date: string,
  dept: DepartmentId,
  roleName: string | undefined,
  status: InspectionStatus,
  inspectorName?: string
): void {
  try {
    const key = getDeptStatusStorageKey(date);
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    const subKey = `${dept}_${roleName || '기본'}`;
    const current = data[subKey] || { status: 'none', inspector: '' };

    data[subKey] = {
      status,
      inspector: inspectorName !== undefined ? inspectorName : (current.inspector || '')
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}
