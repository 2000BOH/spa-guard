import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import type { AppState, TabId, StatusType, ItemState, CheckItem, DepartmentId } from './types';
import { NFC_BASE_NUMBERS } from './types';
import { TAB_INFO, CHECKLIST_DATA, DEPT_TABS_MAP } from './data/checklistData';
import { Header } from './components/Header';
import { MetaStrip } from './components/MetaStrip';
import { CheckListView } from './components/CheckListView';
import { A4PrintDocument } from './components/A4PrintDocument';
import { SaveModal, ShortcutModal, Toast } from './components/Modals';
import { saveInspectionToSupabase, fetchInspectionFromSupabase } from './lib/supabase';
import { loadAdminSettings, getDeptFlatRoles } from './components/AdminModal';
import { updateDeptInspectionStatus } from './lib/deptStatus';
import { MainIndex } from './components/MainIndex';
import { ComingSoon } from './components/ComingSoon';
import MachineRoomPanel from './components/MachineRoomPanel';

const DEPT_NAMES: Record<string, string> = {
  facilities: '시설',
  reception: '리셉션',
  cleaning: '미화',
  food: '푸드',
  snack: '스낵'
};

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
  
  if (dept === 'cleaning' && roleName) {
    if (roleName.includes('여자')) {
      return ['cWTab1', 'cWTab2', 'cWTab3', 'cWTab4'];
    } else if (roleName.includes('남자') && roleName.includes('야간')) {
      return ['cNTab1', 'cNTab2', 'cNTab3'];
    } else if (roleName.includes('남자')) {
      return ['cMTab1', 'cMTab2', 'cMTab3', 'cMTab4'];
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
  const [currentView, setCurrentView] = useState<'main' | 'checklist' | 'comingSoon' | 'panel'>('main');
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [panelTimeLabel, setPanelTimeLabel] = useState('');

  const [currentTab, setCurrentTab] = useState<TabId>('tab2');
  const [availableTabs, setAvailableTabs] = useState<TabId[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
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
          summaries: mergedSummaries
        };
        try {
          localStorage.setItem(getStorageKey(targetDate), JSON.stringify(finalState));
        } catch (e) {}
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

    // 앱 시작 시 서버 데이터 자동 동기화
    syncWithSupabase(todayStr);

    // Parse URL params for QR scanning direct access
    const params = new URLSearchParams(window.location.search);
    let deptParam = params.get('dept') as DepartmentId | null;
    let inspectorParam = params.get('inspector');
    let roleNameParam = params.get('roleName') || undefined;
    
    // NFC 태그 파싱 (자동 배정 로직)
    const nfcParam = params.get('nfc');
    if (nfcParam) {
      const nfcNum = parseInt(nfcParam, 10);
      if (!isNaN(nfcNum)) {
        // 어느 부서인지 파악 (예: 11~19 -> facilities)
        let foundDept: DepartmentId | null = null;
        for (const [dept, baseNum] of Object.entries(NFC_BASE_NUMBERS)) {
          if (nfcNum >= baseNum && nfcNum < baseNum + 10) {
            foundDept = dept as DepartmentId;
            break;
          }
        }

        if (foundDept) {
          const adminSettings = loadAdminSettings();
          const deptConfig = adminSettings.deptConfigs[foundDept];
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
  }, []);

  // 모바일 <-> PC 실시간 연동 (10초 주기 서버 동기화 폴링)
  useEffect(() => {
    if (!state.date) return;
    const interval = setInterval(() => {
      syncWithSupabase(state.date);
    }, 10000);
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

  const handleSelectDepartment = (dept: DepartmentId, defaultInspector: string, roleName?: string) => {
      const tabs = getDeptTabs(dept, roleName);
      setSelectedDept(dept);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        setCurrentTab(tabs[0]);
        setCurrentView('checklist');
      } else {
        setCurrentView('comingSoon');
      }

      // 해당 부서/역할에 관리자가 등록한 실제 이름 탐색
      const loaded = loadAdminSettings();
      const deptConfig = loaded.deptConfigs[dept];
      const flatRoles = getDeptFlatRoles(dept, deptConfig);
      const matchedRole = flatRoles.find(r => r.roleLabel === roleName);

      let realInspector = defaultInspector;
      if (matchedRole && deptConfig) {
        const grp = deptConfig.groups?.[matchedRole.groupIndex];
        const roleDef = grp?.roles?.[matchedRole.roleIndex];
        if (roleDef?.names && roleDef.names.length > 0 && roleDef.names[0]) {
          realInspector = roleDef.names[0];
        } else if (roleDef?.name) {
          const first = roleDef.name.split(',')[0].trim();
          if (first) realInspector = first;
        }
      }

      updateStateAndSave((prev) => ({ ...prev, inspector: realInspector, roleName }));
      updateDeptInspectionStatus(state.date || todayStr, dept, roleName, 'in_progress', realInspector);
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
  const activeSections = CHECKLIST_DATA[currentTab] || [];
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
    showToast("⏳ A4 규격 표지 포함 이미지 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    try {
      const coverEl = document.getElementById('a4PageCover')!;
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvasCover = await html2canvas(coverEl, { scale: 2, backgroundColor: '#0f172a' });
      const linkCover = document.createElement('a');
      linkCover.download = `시설관리일지_블루오션웰니스스파_${state.date}_0표지.jpg`;
      linkCover.href = canvasCover.toDataURL('image/jpeg', 0.95);
      linkCover.click();

      setTimeout(async () => {
        const canvas1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
        const link1 = document.createElement('a');
        link1.download = `시설관리일지_블루오션웰니스스파_${state.date}_1페이지(앞면).jpg`;
        link1.href = canvas1.toDataURL('image/jpeg', 0.95);
        link1.click();

        setTimeout(async () => {
          const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });
          const link2 = document.createElement('a');
          link2.download = `시설관리일지_블루오션웰니스스파_${state.date}_2페이지(뒷면).jpg`;
          link2.href = canvas2.toDataURL('image/jpeg', 0.95);
          link2.click();

          container.style.position = 'absolute';
          container.style.left = '-9999px';
          showToast("✅ 표지 포함 JPG 3장이 다운로드되었습니다.");
        }, 300);
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

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvas1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const img1 = canvas1.toDataURL('image/jpeg', 0.95);
      const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      pdf.addImage(img1, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight1));

      pdf.addPage();
      const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });
      const img2 = canvas2.toDataURL('image/jpeg', 0.95);
      const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
      pdf.addImage(img2, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight2));

      container.style.position = 'absolute';
      container.style.left = '-9999px';

      pdf.save(`시설관리일지_블루오션웰니스스파_${state.date}_A4.pdf`);
      showToast("✅ A4 2페이지 PDF 문서가 다운로드되었습니다.");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      alert("PDF 생성 오류: " + err);
    }
  };

  // Kakao Submit Logic with COVER IMAGE as Image 1
  const handleSubmitToKakao = async () => {
    showToast("⏳ 표지 포함 카톡 전송 데이터 준비 중...");

    saveInspectionToSupabase(state).then((res) => {
      if (res.success) {
        console.log('Supabase Saved Successfully');
      }
    });

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
      const sections = CHECKLIST_DATA[tid] || [];
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

    try {
      const coverEl = document.getElementById('a4PageCover')!;
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvasCover = await html2canvas(coverEl, { scale: 2, backgroundColor: '#0f172a' });
      const canvas1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });

      container.style.position = 'absolute';
      container.style.left = '-9999px';

      const blobCover = await new Promise<Blob>((resolve) => canvasCover.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));
      const blob1 = await new Promise<Blob>((resolve) => canvas1.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));
      const blob2 = await new Promise<Blob>((resolve) => canvas2.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));

      const fileCover = new File([blobCover], `시설관리일지_${state.date}_0표지.jpg`, { type: 'image/jpeg' });
      const file1 = new File([blob1], `시설관리일지_${state.date}_1페이지(앞면).jpg`, { type: 'image/jpeg' });
      const file2 = new File([blob2], `시설관리일지_${state.date}_2페이지(뒷면).jpg`, { type: 'image/jpeg' });

      // First file in array is the COVER PAGE image!
      const filesArray = [fileCover, file1, file2];

      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          title: '{시설 점검 보고}',
          text: msg,
          files: filesArray
        });
      // 점검완료 상태 기록 헬퍼
      const markCompleted = () => {
        if (selectedDept) {
          updateDeptInspectionStatus(state.date || todayStr, selectedDept, state.roleName, 'completed', state.inspector);
        }
      };

      markCompleted();
      } else if (navigator.share) {
        downloadA4SplitImages();
        await navigator.share({
          title: '{시설 점검 보고}',
          text: msg
        });
        showToast("📲 보고서와 이미지가 준비되었습니다.");
        return;
      }

      downloadA4SplitImages();
      navigator.clipboard.writeText(msg).then(() => {
        alert("📋 요약 보고서가 복사되었고 점검표 표지 포함 이미지 3장이 다운로드되었습니다!\n\n카카오톡 단체방에 [붙여넣기]하고 다운로드된 표지 및 사진 3장을 함께 올려주세요.");
      });
    } catch (e) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      console.error(e);
    }
  };

  if (currentView === 'main') {
    return (
      <>
        <MainIndex onSelectDepartment={handleSelectDepartment} onOpenPanel={handleOpenPanel} />
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
            const loaded = loadAdminSettings();
            const namesSet = new Set<string>();

            // 현재 부서 우선 수집
            if (selectedDept && loaded.deptConfigs[selectedDept]) {
              const deptConfig = loaded.deptConfigs[selectedDept];
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

            // 기타 부서에 등록된 관리자 지정 담당자 이름들도 함께 추가
            Object.values(loaded.deptConfigs).forEach(cfg => {
              cfg.groups?.forEach(grp => {
                grp.roles?.forEach(r => {
                  if (r.names && r.names.length > 0) {
                    r.names.forEach(n => n.trim() && namesSet.add(n.trim()));
                  } else if (r.name) {
                    r.name.split(',').forEach(n => n.trim() && namesSet.add(n.trim()));
                  }
                });
              });
            });

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
