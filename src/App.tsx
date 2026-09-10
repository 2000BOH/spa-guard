import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import type { AppState, TabId, StatusType, ItemState, CheckItem, DepartmentId, AdminSettings } from './types';
import { NFC_BASE_NUMBERS } from './types';
import { TAB_INFO, DEPT_TABS_MAP } from './data/checklistData';
import { Header } from './components/Header';
import { MetaStrip } from './components/MetaStrip';
import { CheckListView } from './components/CheckListView';
import { A4PrintDocument } from './components/A4PrintDocument';
import { SaveModal, ShortcutModal, Toast } from './components/Modals';
import { supabase, saveInspectionToSupabase, fetchInspectionFromSupabase, fetchAdminSettingsFromSupabase } from './lib/supabase';
import { loadAdminSettings, applyAdminSettings, getDeptFlatRoles, getEffectiveChecklistData } from './lib/adminSettings';
import { updateDeptInspectionStatus, getDeptInspectionStatus } from './lib/deptStatus';
import { MainIndex } from './components/MainIndex';
import { ComingSoon } from './components/ComingSoon';
import MachineRoomPanel from './components/MachineRoomPanel';
import { ChecklistEditorPage } from './components/ChecklistEditorPage';

const DEPT_NAMES: Record<string, string> = {
  facilities: '시설',
  reception: '리셉션',
  cleaning: '미화',
  food: '푸드',
  snack: '스낵'
};

function addPageNumber(canvas: HTMLCanvasElement, pageNum: number, totalPages: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const fontSize = Math.round(canvas.width * 0.022);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.fillText(`- ${pageNum} / ${totalPages} -`, canvas.width / 2, canvas.height - Math.round(fontSize * 0.7));
}

// 캔버스를 A4 세로 비율(210:297)로 정확히 자름 (JPG용)
function cropToA4(srcCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const targetWidth = srcCanvas.width;
  const targetHeight = Math.round(srcCanvas.width * 297 / 210);
  const dest = document.createElement('canvas');
  dest.width = targetWidth;
  dest.height = targetHeight;
  const ctx = dest.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  const drawH = Math.min(srcCanvas.height, targetHeight);
  ctx.drawImage(srcCanvas, 0, 0, srcCanvas.width, drawH, 0, 0, targetWidth, drawH);
  return dest;
}

// 분할 지점 근처에서 테이블 행 경계선(어두운 행 → 밝은 행 전환)을 찾아 행 중간 절단 방지
// 왼쪽 15%(rowspan 열 - 항상 흰색)는 제외하고 나머지 열만 분석
function findBestSplitRow(srcCanvas: HTMLCanvasElement, nominalY: number, range: number): number {
  const ctx = srcCanvas.getContext('2d');
  if (!ctx || nominalY <= 2 || nominalY >= srcCanvas.height) return nominalY;
  const w = srcCanvas.width;
  const skipX = Math.floor(w * 0.15); // rowspan 열 건너뜀
  const sampleW = w - skipX;
  const searchStart = Math.max(2, nominalY - range);
  const searchEnd = Math.min(srcCanvas.height - 2, nominalY + range);
  const h = searchEnd - searchStart;
  if (h <= 0) return nominalY;
  const data = ctx.getImageData(skipX, searchStart, sampleW, h).data;

  const rowAvg = (row: number) => {
    let sum = 0;
    for (let x = 0; x < sampleW; x++) {
      const i = (row * sampleW + x) * 4;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / sampleW;
  };

  const base = nominalY - searchStart;
  // 위쪽 방향 탐색: 어두운 행(경계선) 바로 다음 밝은 행을 찾음
  for (let d = 0; d <= base - 1; d++) {
    const row = base - d;
    if (rowAvg(row) > 235 && rowAvg(row - 1) < 215) return searchStart + row;
  }
  // 아래쪽 탐색
  for (let d = 1; d < h - base - 1; d++) {
    const row = base + d;
    if (rowAvg(row) > 235 && rowAvg(row - 1) < 215) return searchStart + row;
  }
  return nominalY;
}

// 캔버스를 A4 단위로 분할 — 표 행 경계에서 끊고 하단 4% 여백에 페이지 번호 공간 확보
function splitCanvasToA4Pages(srcCanvas: HTMLCanvasElement): HTMLCanvasElement[] {
  const pageW = srcCanvas.width;
  const pageH = Math.round(srcCanvas.width * 297 / 210);
  const bottomPad = Math.round(pageH * 0.04);
  const contentH = pageH - bottomPad;
  const searchRange = Math.round(contentH * 0.08); // ±8% 범위에서 최적 분할점 탐색
  const pages: HTMLCanvasElement[] = [];
  let y = 0;
  while (y < srcCanvas.height) {
    const nomEnd = y + contentH;
    const actualEnd = nomEnd < srcCanvas.height
      ? findBestSplitRow(srcCanvas, nomEnd, searchRange)
      : srcCanvas.height;
    const dest = document.createElement('canvas');
    dest.width = pageW;
    dest.height = pageH;
    const ctx = dest.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageW, pageH);
    const sliceH = Math.min(actualEnd - y, srcCanvas.height - y);
    ctx.drawImage(srcCanvas, 0, y, pageW, sliceH, 0, 0, pageW, sliceH);
    pages.push(dest);
    y = actualEnd;
  }
  return pages;
}

function getDeptTabs(dept: DepartmentId, roleName?: string): string[] {
  let tabs = DEPT_TABS_MAP[dept] || [];
  
  if (dept === 'facilities') {
    if (roleName && roleName.includes('야간')) {
      return ['tab1', 'tab3'];
    }
    return ['tab1', 'tab2', 'tab3', 'tab4', 'tab5'];
  }
  
  if (dept === 'reception' && roleName) {
    if (roleName.includes('오전')) return ['rTab1'];
    if (roleName.includes('오후')) return ['rTab2'];
    if (roleName.includes('야간') || roleName.includes('마감')) return ['rTab3'];
  }
  
  if (dept === 'food' && roleName) {
    if (roleName.includes('오픈')) return ['fTab1'];
    if (roleName.includes('마감')) return ['fTab2'];
  }
  
  if (dept === 'snack' && roleName) {
    if (roleName.includes('오픈')) return ['sTab1'];
    if (roleName.includes('마감')) return ['sTab2'];
  }
  
  if (dept === 'cleaning') {
    if (roleName && roleName.includes('(여)')) {
      return ['cTabW'];
    } else {
      return ['cTabM'];
    }
  }
  
  return tabs;
}

const getStorageKey = (date: string) => `spa_date_data_${date}`;

function getTodayStr(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'main' | 'checklist' | 'comingSoon' | 'panel' | 'editor'>('main');
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [directEditorDept, setDirectEditorDept] = useState<DepartmentId | null>(null);
  const [panelTimeLabel, setPanelTimeLabel] = useState('');

  const [currentTab, setCurrentTab] = useState<TabId>('tab2');
  const [availableTabs, setAvailableTabs] = useState<TabId[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(loadAdminSettings);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  const [state, setState] = useState<AppState>(() => {
    return {
      storeName: '블루오션 웰니스 스파',
      date: todayStr,
      inspector: '점검자',
      items: {},
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '', tab5: '' },
      securityCode: '',
      lastModified: ''
    };
  });

  const isReadOnly = state.date < yesterdayStr;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const generateSecurityLog = (items: Record<string, ItemState>, inspector: string) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    const payload = `${timeStr}_${inspector || '점검자'}_${JSON.stringify(items)}`;
    let hashNum = 0;
    for (let idx = 0; idx < payload.length; idx++) {
      hashNum = (hashNum << 5) - hashNum + payload.charCodeAt(idx);
      hashNum |= 0;
    }
    const hexCode = Math.abs(hashNum).toString(16).toUpperCase().padStart(8, '0');
    const finalCode = `SPA-AUTH-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${hexCode}`;

    return { lastModified: timeStr, securityCode: finalCode };
  };

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDateData = (targetDate: string) => {
    try {
      const raw = localStorage.getItem(getStorageKey(targetDate));
      if (raw) {
        const saved = JSON.parse(raw);
        return {
          storeName: '블루오션 웰니스 스파',
          date: targetDate,
          inspector: saved.inspector || '점검자',
          items: saved.items || {},
          summaries: saved.summaries || { tab1: '', tab2: '', tab3: '', tab4: '', tab5: '' },
          securityCode: saved.securityCode || '',
          lastModified: saved.lastModified || ''
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      storeName: '블루오션 웰니스 스파',
      date: targetDate,
      inspector: '점검자',
      items: {},
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '', tab5: '' },
      securityCode: '',
      lastModified: ''
    };
  };

  // 서버(Supabase)와 데이터 실시간 불러오기 및 병합
  const syncWithSupabase = async (targetDate: string, showNotification = false) => {
    const res = await fetchInspectionFromSupabase(targetDate);
    if (res.success && res.log) {
      const log = res.log;
      const remoteState: AppState = {
        storeName: log.store_name || '블루오션 웰니스 스파',
        date: log.check_date || targetDate,
        inspector: log.inspector || '점검자',
        items: log.items_state || {},
        summaries: log.summaries || { tab1: '', tab2: '', tab3: '', tab4: '', tab5: '' },
        securityCode: log.security_code || '',
        lastModified: log.recorded_at || ''
      };

      setState(prev => {
        const mergedItems = { ...prev.items, ...remoteState.items };
        const mergedSummaries = { ...prev.summaries, ...remoteState.summaries };
        const finalState = {
          ...prev,
          ...remoteState,
          items: mergedItems,
          summaries: mergedSummaries,
          inspector: (prev.inspector && prev.inspector !== '점검자') ? prev.inspector : remoteState.inspector
        };
        try {
          localStorage.setItem(getStorageKey(targetDate), JSON.stringify(finalState));
        } catch {}
        return finalState;
      });

      if (showNotification) {
        showToast(`☁️ ${targetDate} 서버 동기화 완료`);
      }
    }
  };

  useEffect(() => {
    const initialData = loadDateData(todayStr);
    const sec = generateSecurityLog(initialData.items, initialData.inspector);
    setState({
      ...initialData,
      ...sec
    });

    // 앱 시작 시 서버 데이터(관리자 설정 & 오늘 점검 데이터) 자동 동기화
    fetchAdminSettingsFromSupabase().then((res) => {
      if (res.success && res.settings) {
        applyAdminSettings(res.settings as AdminSettings);
        setAdminSettings(res.settings as AdminSettings);
      }
    });

    syncWithSupabase(todayStr);

    // Supabase Realtime 구독: 다른 디바이스(PC/모바일)에서 변경 시 실시간 푸시 동기화
    if (supabase) {
      const client = supabase;
      const channel = client
        .channel('public:inspection_logs_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inspection_logs' },
          async () => {
            // payload.new 데이터에 의존하지 않고 직접 re-fetch
            // (REPLICA IDENTITY FULL 미설정 시 payload에 컬럼 데이터가 없을 수 있음)
            const adminRes = await fetchAdminSettingsFromSupabase();
            if (adminRes.success && adminRes.settings) {
              const prevJson = localStorage.getItem('spa_admin_settings');
              const newJson = JSON.stringify(adminRes.settings);
              if (prevJson !== newJson) {
                applyAdminSettings(adminRes.settings as AdminSettings);
                setAdminSettings(adminRes.settings as AdminSettings);
                showToast('⚡ 관리자 설정이 실시간 동기화되었습니다');
              }
            }
            syncWithSupabase(todayStr, true);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }

    // Parse URL params for QR scanning direct access
    const params = new URLSearchParams(window.location.search);
    let deptParam = params.get('dept') as DepartmentId | null;
    let inspectorParam = params.get('inspector');
    let roleNameParam = params.get('roleName') || undefined;
    
    // NFC 태그 파싱 (자동 배정 및 편집 파트 파싱)
    const nfcParam = params.get('nfc');
    if (nfcParam) {
      const nfcNum = parseInt(nfcParam, 10);
      if (!isNaN(nfcNum)) {
        // 91~95번 NFC: 각 파트 팀장 전용 독립 체크리스트 편집 전용 페이지
        if (nfcNum >= 91 && nfcNum <= 95) {
          const editMap: Record<number, DepartmentId> = {
            91: 'facilities', 92: 'reception', 93: 'cleaning', 94: 'food', 95: 'snack'
          };
          const targetDept = editMap[nfcNum];
          if (targetDept) {
            setDirectEditorDept(targetDept);
            setCurrentView('editor');
            return;
          }
        }

        // 어느 부서인지 파악 (예: 11~19 -> facilities)
        let foundDept: DepartmentId | null = null;
        for (const [dept, baseNum] of Object.entries(NFC_BASE_NUMBERS)) {
          if (nfcNum >= baseNum && nfcNum < baseNum + 10) {
            foundDept = dept as DepartmentId;
            break;
          }
        }

        if (foundDept) {
          const currentAdminSettings = loadAdminSettings();
          const deptConfig = currentAdminSettings.deptConfigs[foundDept];
          const flatRoles = getDeptFlatRoles(foundDept, deptConfig);
          const matchedRole = flatRoles.find(r => r.nfcNum === nfcNum);

          if (matchedRole) {
            deptParam = foundDept;
            roleNameParam = matchedRole.roleLabel;
            
            // 관리자 설정에서 입력된 이름 탐색
            const pool = deptConfig?.inspectorPool || [];
            const grp = deptConfig?.groups?.[matchedRole.groupIndex];
            const nameInGroup = grp?.roles?.[matchedRole.roleIndex]?.name;
            const nameInPool = pool[matchedRole.flatIndex] || '';

            const assignedName = nameInGroup || nameInPool;
            inspectorParam = assignedName || '점검자';
          } else {
            setTimeout(() => showToast(`⚠️ 해당 번호(${nfcNum}번)에 배정된 점검자가 없습니다. 관리자 설정을 확인하세요.`), 500);
          }
        } else {
          setTimeout(() => showToast(`⚠️ 유효하지 않은 NFC 대역입니다 (${nfcParam})`), 500);
        }
      }
    }
    
    const viewParam = params.get('view');
    if (viewParam === 'panel') {
      const timeParam = params.get('time') || '00시';
      setPanelTimeLabel(timeParam);
      setCurrentView('panel');
    } else if (deptParam && inspectorParam) {
      const tabs = getDeptTabs(deptParam, roleNameParam);
      setSelectedDept(deptParam);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        setCurrentTab(tabs[0]);
        setCurrentView('checklist');
      } else {
        setCurrentView('comingSoon');
      }
      
      setState(prev => {
        const next = { ...prev, inspector: inspectorParam, roleName: roleNameParam };
        const updatedSec = generateSecurityLog(next.items, next.inspector);
        return { ...next, ...updatedSec };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 모바일 <-> PC 실시간 연동 (10초 주기 서버 동기화 폴링)
  useEffect(() => {
    if (!state.date) return;
    const syncAll = async () => {
      // 점검 데이터 동기화
      syncWithSupabase(state.date);
      // 관리자 설정(담당자 등) 동기화 - Realtime이 동작하지 않을 때도 반영되도록
      const adminRes = await fetchAdminSettingsFromSupabase();
      if (adminRes.success && adminRes.settings) {
        const prevJson = localStorage.getItem('spa_admin_settings');
        const newJson = JSON.stringify(adminRes.settings);
        if (prevJson !== newJson) {
          applyAdminSettings(adminRes.settings as AdminSettings);
          setAdminSettings(adminRes.settings as AdminSettings);
        }
      }
    };
    const interval = setInterval(syncAll, 10000);
    return () => clearInterval(interval);
  }, [state.date]);

  const updateStateAndSave = (updater: (prev: AppState) => AppState) => {
    if (isReadOnly) {
      showToast("⚠️ 과거 기록은 수정할 수 없습니다 (조회 전용).");
      return;
    }

    setState((prev) => {
      const next = updater(prev);
      const secLog = generateSecurityLog(next.items, next.inspector);
      const finalState = {
        ...next,
        ...secLog
      };
      try {
        localStorage.setItem(getStorageKey(finalState.date), JSON.stringify(finalState));
      } catch (e) {
        console.error(e);
      }

      // 모바일 & PC 실시간 Supabase 자동 저장 (1초 디바운스)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveInspectionToSupabase(finalState);
      }, 1000);

      return finalState;
    });
  };

  const handleDateChange = (newDate: string) => {
    const raw = localStorage.getItem(getStorageKey(newDate));
    const loaded = loadDateData(newDate);
    const sec = generateSecurityLog(loaded.items, loaded.inspector);
    setState({
      ...loaded,
      ...sec
    });
    
    // 선택 날짜 서버 데이터 동기화
    syncWithSupabase(newDate, true);

    if (raw) {
      showToast(`📅 ${newDate} 작성된 점검일지 불러옴`);
    } else {
      showToast(`📅 ${newDate} 점검일지 불러옴 (새 일지)`);
    }
  };

  const handleSelectDepartment = (dept: DepartmentId, _defaultInspector: string, roleName?: string) => {
      const tabs = getDeptTabs(dept, roleName);
      setSelectedDept(dept);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        setCurrentTab(tabs[0]);
        setCurrentView('checklist');
      } else {
        setCurrentView('comingSoon');
      }

      // 기존 기록 확인 (점검자가 들어가서 자기 이름을 지정한 상태일 때만 유지)
      const currentStatus = getDeptInspectionStatus(state.date || todayStr, dept, roleName);
      const activeInspector = (currentStatus.status !== 'none' && currentStatus.inspector && currentStatus.inspector !== '점검자')
        ? currentStatus.inspector
        : '점검자';

      updateStateAndSave((prev) => ({ ...prev, inspector: activeInspector, roleName }));
  };

  /** 기계실 패널 열기 (00시 / 03시 / 06시) */
  const handleOpenPanel = (timeLabel: string) => {
    setPanelTimeLabel(timeLabel);
    setCurrentView('panel');
  };

  const handleSetStatus = (id: string, status: StatusType) => {
    updateStateAndSave((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: {
          ...prev.items[id],
          status
        }
      }
    }));
  };

  const handleSaveNote = (id: string, note: string) => {
    updateStateAndSave((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: {
          ...prev.items[id],
          note
        }
      }
    }));
  };

  const handleUpdateTab4ItemBatch = (id: string, updates: Partial<ItemState>) => {
    updateStateAndSave((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: {
          ...prev.items[id],
          ...updates
        }
      }
    }));
  };

  const handleChangeSummary = (summary: string) => {
    updateStateAndSave((prev) => ({
      ...prev,
      summaries: {
        ...prev.summaries,
        [currentTab]: summary
      }
    }));
  };

  // Direct Printer Trigger
  const handlePrintPrinter = () => {
    showToast("🖨️ 프린터 출력 창을 여는 중...");
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Counts Calculation
  const activeSections = getEffectiveChecklistData(currentTab, adminSettings.customChecklists);
  const activeItems = activeSections.flatMap((s) => s.items);

  let cntN = 0;
  let cntI = 0;
  let done = 0;

  activeItems.forEach((item: CheckItem) => {
    const itemState = state.items[item.id] || {};
    if (item.type === 'filter' || item.type === 'pump') {
      const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';
      const isInspected = itemState.pressure !== undefined || itemState.sound !== undefined || itemState.backwash !== undefined || itemState.hairCatcher !== undefined;
      if (isIssue) { cntI++; done++; }
      else if (isInspected) { cntN++; done++; }
    } else if (item.type === 'temp') {
      const isInspected = itemState.tempDawn !== undefined || itemState.tempMorning !== undefined || itemState.tempAfternoon !== undefined;
      if (isInspected) { cntN++; done++; }
    } else {
      const st = itemState.status;
      if (st === 'normal') { cntN++; done++; }
      else if (st === 'issue') { cntI++; done++; }
    }
  });

  const total = activeItems.length || 1;
  const cntP = total - done;
  const progressPct = Math.round((done / total) * 100);

  // Image & PDF Export Logic
  const downloadA4SplitImages = async () => {
    setIsSaveModalOpen(false);
    showToast("⏳ A4 규격 이미지 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const baseName = `${state.date}_${deptName}_${state.inspector || '점검자'}`;

    try {
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const raw1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const canvas1 = cropToA4(raw1);
      addPageNumber(canvas1, 1, 2);
      const link1 = document.createElement('a');
      link1.download = `${baseName}_1.jpg`;
      link1.href = canvas1.toDataURL('image/jpeg', 0.95);
      link1.click();

      setTimeout(async () => {
        const raw2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });
        const canvas2 = cropToA4(raw2);
        addPageNumber(canvas2, 2, 2);
        const link2 = document.createElement('a');
        link2.download = `${baseName}_2.jpg`;
        link2.href = canvas2.toDataURL('image/jpeg', 0.95);
        link2.click();

        container.style.position = 'absolute';
        container.style.left = '-9999px';
        showToast("✅ A4 비율 JPG 2장 다운로드 완료");
      }, 300);
    } catch (err) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      alert("이미지 생성 오류: " + err);
    }
  };

  const downloadA4MultipagePDF = async () => {
    setIsSaveModalOpen(false);
    showToast("⏳ A4 2페이지 PDF 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const baseName = `${state.date}_${deptName}_${state.inspector || '점검자'}`;

    try {
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      // 내용이 길어도 A4 단위로 분할 → 내용 손실 없음
      const raw1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const raw2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });

      const pages1 = splitCanvasToA4Pages(raw1);
      const pages2 = splitCanvasToA4Pages(raw2);
      const allPages = [...pages1, ...pages2];
      const total = allPages.length;

      allPages.forEach((pg, i) => addPageNumber(pg, i + 1, total));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      allPages.forEach((pg, i) => {
        if (i > 0) pdf.addPage();
        pdf.addImage(pg.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH);
      });

      container.style.position = 'absolute';
      container.style.left = '-9999px';

      pdf.save(`${baseName}.pdf`);
      showToast("✅ PDF 다운로드 완료");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      alert("PDF 생성 오류: " + err);
    }
  };

  // Kakao Submit Logic with COVER IMAGE as Image 1
  const handleSubmitToKakao = async () => {
    showToast("⏳ 표지 포함 카톡 전송 데이터 준비 중...");

    saveInspectionToSupabase(state);

    const markCompleted = () => {
      if (selectedDept) {
        updateDeptInspectionStatus(state.date || todayStr, selectedDept, state.roleName, 'completed', state.inspector);
      }
    };

    let msg = `{시설 점검 보고}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏢 업소명: 블루오션 웰니스 스파\n`;
    msg += `📅 점검일자: ${state.date}\n`;
    msg += `👤 점검자: ${state.inspector || '점검자'}\n`;
    msg += `🔒 인증코드: ${state.securityCode}\n`;
    msg += `⏰ 기록시간: ${state.lastModified}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    availableTabs.forEach((tid) => {
      const tabInfo = TAB_INFO[tid];
      if (!tabInfo) return;
      const sections = getEffectiveChecklistData(tid, adminSettings.customChecklists);
      const items = sections.flatMap((s) => s.items);

      let n = 0;
      let i = 0;
      const issues: string[] = [];

      items.forEach((item: CheckItem) => {
        const itemState = state.items[item.id] || {};
        if (item.type === 'filter' || item.type === 'pump') {
          const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';
          if (isIssue) {
            i++;
            issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${itemState.note || '상세 없음'}`);
          } else if (itemState.pressure !== undefined || itemState.sound !== undefined || itemState.backwash !== undefined || itemState.hairCatcher !== undefined) {
            n++;
          }
        } else if (item.type === 'temp') {
          const isInspected = itemState.tempDawn !== undefined || itemState.tempMorning !== undefined || itemState.tempAfternoon !== undefined;
          if (isInspected) n++;
        } else {
          const st = itemState.status;
          if (st === 'normal') n++;
          else if (st === 'issue') {
            i++;
            issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${itemState.note || '상세 없음'}`);
          }
        }
      });

      msg += `■ ${tabInfo.name} (정상/기록 ${n} / 이상 ${i})\n`;
      msg += issues.length > 0 ? `${issues.join('\n')}\n` : `  ✅ 전 항목 '이상무 (O)' 적합\n`;

      const sumText = state.summaries[tid];
      if (sumText) {
        msg += `  📝 의견: ${sumText}\n`;
      }
      msg += `\n`;
    });

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const baseName = `${state.date}_${deptName}_${state.inspector || '점검자'}`;

    try {
      const coverEl = document.getElementById('a4PageCover')!;
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvasCover = await html2canvas(coverEl, { scale: 2, backgroundColor: '#0f172a' });
      const raw1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const raw2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });

      // A4 단위로 분할 (내용이 길면 3장 이상 가능)
      const pages1 = splitCanvasToA4Pages(raw1);
      const pages2 = splitCanvasToA4Pages(raw2);
      const allContentPages = [...pages1, ...pages2];
      const total = allContentPages.length;
      allContentPages.forEach((pg, i) => addPageNumber(pg, i + 1, total));

      container.style.position = 'absolute';
      container.style.left = '-9999px';

      // 표지 1장 + 분할된 내용 페이지들
      const coverBlob = await new Promise<Blob>((resolve) => canvasCover.toBlob((b) => resolve(b!), 'image/jpeg', 0.92));
      const contentBlobs = await Promise.all(
        allContentPages.map(pg => new Promise<Blob>((resolve) => pg.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)))
      );

      const filesArray: File[] = [
        new File([coverBlob], `${baseName}_표지.jpg`, { type: 'image/jpeg' }),
        ...contentBlobs.map((b, i) => new File([b], `${baseName}_${i + 1}.jpg`, { type: 'image/jpeg' })),
      ];

      // 카톡에서 첫 장(표지)이 단독 전체폭으로 표시되려면 전체 파일 수가 홀수여야 함
      if (filesArray.length % 2 === 0) {
        const blankC = document.createElement('canvas');
        blankC.width = allContentPages[0].width;
        blankC.height = allContentPages[0].height;
        blankC.getContext('2d')!.fillStyle = '#ffffff';
        blankC.getContext('2d')!.fillRect(0, 0, blankC.width, blankC.height);
        const blankBlob = await new Promise<Blob>((resolve) => blankC.toBlob((b) => resolve(b!), 'image/jpeg', 0.5));
        filesArray.push(new File([blankBlob], `${baseName}_blank.jpg`, { type: 'image/jpeg' }));
      }

      let sharedSuccessfully = false;

      // 1단계: 모바일 공유 API (파일 3개 직접 공유) — 카카오톡 공유창 열림
      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        try {
          await navigator.share({
            title: '{시설 점검 보고}',
            text: msg,
            files: filesArray
          });
          sharedSuccessfully = true;
        } catch (shareErr) {
          console.warn("파일 포함 공유 실패 또는 사용자 취소:", shareErr);
        }
      }

      // 2단계: 파일 공유 미지원/실패 시 전체 이미지 다운로드 + 클립보드 복사
      if (!sharedSuccessfully) {
        for (const f of filesArray) {
          const url = URL.createObjectURL(f);
          const a = document.createElement('a');
          a.href = url;
          a.download = f.name;
          a.click();
          URL.revokeObjectURL(url);
        }
        try {
          await navigator.clipboard.writeText(msg);
          alert(`📋 요약 보고서가 복사되었고 점검표 이미지 ${filesArray.length}장이 다운로드되었습니다!\n\n카카오톡 단체방에 [붙여넣기]하고 다운로드된 이미지를 함께 올려주세요.`);
        } catch (clipErr) {
          console.warn("클립보드 복사 실패:", clipErr);
          alert("📋 점검표 이미지 3장이 다운로드되었습니다.\n\n요약 보고서 텍스트를 카카오톡 단체방에 직접 공유해주세요.");
        }
      }

      markCompleted();
    } catch (e) {
      if (container) {
        container.style.position = 'absolute';
        container.style.left = '-9999px';
      }
      console.error(e);
      alert("카카오톡 전송 처리 중 오류가 발생했습니다: " + e);
    }
  };

  if (currentView === 'main') {
    return (
      <>
        <MainIndex onSelectDepartment={handleSelectDepartment} onOpenPanel={handleOpenPanel} adminSettings={adminSettings} />
        <Toast message={toastMsg} />
      </>
    );
  }

  if (currentView === 'panel') {
    const mappedSlot = panelTimeLabel === '00시' ? '00:00' : panelTimeLabel === '03시' ? '02:30' : panelTimeLabel === '06시' ? '05:00' : undefined;

    return (
      <div className="machine-room-view" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
        {/* 상단 바 */}
        <div className="print-hide" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#1e293b', flexShrink: 0
        }}>
          <button
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setCurrentView('main');
            }}
            style={{
              background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            ← 돌아가기
          </button>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
            ⚙️ 기계실 패널 — {panelTimeLabel}
          </span>
          <button
            onClick={() => window.print()}
            style={{
              background: '#2563eb', border: 'none', color: '#fff', fontSize: '13px',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '6px'
            }}
          >
            🖨️ 출력
          </button>
        </div>
        {/* MachineRoomPanel component */}
        <div className="machine-room-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <MachineRoomPanel admin={false} initialSlot={mappedSlot} />
        </div>
      </div>
    );
  }

  // 91~95번 NFC 전용 팀장 독립 파트 체크리스트 편집 페이지
  if (currentView === 'editor' && directEditorDept) {
    return (
      <ChecklistEditorPage
        dept={directEditorDept}
        isDirectAccess={true}
      />
    );
  }

  if (currentView === 'comingSoon' && selectedDept) {
    return (
      <>
        <ComingSoon 
          department={selectedDept} 
          inspector={state.inspector} 
          onBack={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setCurrentView('main');
          }} 
        />
        <Toast message={toastMsg} />
      </>
    );
  }

  return (
    <div>
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        progressPct={progressPct}
        departmentName={(selectedDept && DEPT_NAMES[selectedDept]) || '점검'}
        availableTabs={availableTabs}
        onBack={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setCurrentView('main');
        }}
      >
        <MetaStrip
          checkDate={state.date}
          inspector={state.inspector}
          cntN={cntN}
          cntI={cntI}
          cntP={cntP}
          isReadOnly={isReadOnly}
          onChangeCheckDate={handleDateChange}
          onChangeInspector={(val) => {
            updateStateAndSave((p) => ({ ...p, inspector: val }));
            if (selectedDept) {
              const isCleared = !val || val === '점검자';
              updateDeptInspectionStatus(
                state.date || todayStr, 
                selectedDept, 
                state.roleName, 
                isCleared ? 'none' : 'in_progress', 
                isCleared ? '' : val
              );
            }
          }}
          inspectorOptions={(() => {
            if (!selectedDept) return [];
            const deptConfig = adminSettings?.deptConfigs?.[selectedDept];
            if (!deptConfig) return [];

            const namesSet = new Set<string>();

            if (selectedDept === 'cleaning') {
              const isWomanTab = state.roleName && state.roleName.includes('(여)');
              const isNightTab = state.roleName && state.roleName.includes('야간');
              const pool = deptConfig.inspectorPool || [];
              const womenPool = deptConfig.womenPool || [];
              const nightPool = deptConfig.nightPool || [];
              
              pool.forEach((n, idx) => {
                const isW = !!womenPool[idx];
                const isN = !!nightPool[idx];
                
                if (isNightTab) {
                  if (!isN) return;
                } else if (isWomanTab) {
                  if (!isW || isN) return;
                } else {
                  if (isW || isN) return;
                }
                
                n.split(',').forEach(sn => sn.trim() && namesSet.add(sn.trim()));
              });
            } else {
              deptConfig.groups?.forEach(grp => {
                grp.roles?.forEach(r => {
                  if (r.names && r.names.length > 0) {
                    r.names.forEach(n => n.trim() && namesSet.add(n.trim()));
                  } else if (r.name) {
                    r.name.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
                  }
                });
              });
              if (deptConfig.inspectorPool) {
                deptConfig.inspectorPool.forEach(p => {
                  p.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
                });
              }
            }
            return Array.from(namesSet);
          })()}
        />
      </Header>

      <CheckListView
        currentTab={currentTab}
        itemsState={state.items}
        summaryText={state.summaries[currentTab]}
        isReadOnly={isReadOnly}
        onSetStatus={handleSetStatus}
        onSaveNote={handleSaveNote}
        onChangeSummary={handleChangeSummary}
        onUpdateTab4ItemBatch={handleUpdateTab4ItemBatch}
      />

      {/* 3개 버튼 하단 액션바: 저장 (좌) - 카톡제출 (중앙) - 출력 (우) */}
      <footer className="bottom-bar">
        <button className="btn-action-save" onClick={() => setIsSaveModalOpen(true)}>
          <span>💾</span>
          <span>저장</span>
        </button>
        <button className="btn-submit-kakao" onClick={handleSubmitToKakao}>
          <span>💬</span>
          <span>카톡제출</span>
        </button>
        <button className="btn-action-print" onClick={handlePrintPrinter}>
          <span>🖨️</span>
          <span>출력</span>
        </button>
      </footer>

      <A4PrintDocument state={state} departmentName={(selectedDept && DEPT_NAMES[selectedDept]) || '점검'} availableTabs={availableTabs} />

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onDownloadJPG={downloadA4SplitImages}
        onDownloadPDF={downloadA4MultipagePDF}
      />

      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
      />

      <Toast message={toastMsg} />
    </div>
  );
}
