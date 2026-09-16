import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import type { AppState, TabId, StatusType, ItemState, CheckItem, DepartmentId, AdminSettings } from './types';
import { NFC_BASE_NUMBERS } from './types';
import { TAB_INFO, getDeptTabs } from './data/checklistData';
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
import { DeptAdminPage } from './components/DeptAdminPage';


const DEPT_NAMES: Record<string, string> = {
  facilities: '시설',
  reception: '리셉션',
  cleaning: '미화',
  food: '푸드',
  snack: '스낵'
};

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
  const [currentView, setCurrentView] = useState<'main' | 'checklist' | 'comingSoon' | 'panel' | 'editor' | 'deptAdmin'>('main');
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [directEditorDept, setDirectEditorDept] = useState<DepartmentId | null>(null);
  const [deptAdminDept, setDeptAdminDept] = useState<DepartmentId | null>(null);
  // NFC 직접 접속 여부 - true이면 체크리스트에서 뒤로가기 버튼 숨김
  const [isNfcDirect, setIsNfcDirect] = useState(false);
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
      handovers: {},
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
    // ISO 8601 포맷으로 통일하여 모든 브라우저에서 정확한 시간 비교 보장
    const now = new Date();
    const isoStr = now.toISOString();

    const payload = `${isoStr}_${inspector || '점검자'}_${JSON.stringify(items)}`;
    let hashNum = 0;
    for (let idx = 0; idx < payload.length; idx++) {
      hashNum = (hashNum << 5) - hashNum + payload.charCodeAt(idx);
      hashNum |= 0;
    }
    const hexCode = Math.abs(hashNum).toString(16).toUpperCase().padStart(8, '0');
    const finalCode = `SPA-AUTH-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${hexCode}`;

    return { lastModified: isoStr, securityCode: finalCode };
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
          handovers: saved.handovers || {},
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
      handovers: {},
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
        handovers: log.handovers || {},
        securityCode: log.security_code || '',
        lastModified: log.recorded_at || ''
      };

      setState(prev => {
        // ISO 포맷으로 통일되어 있으므로 직접 new Date() 파싱 가능
        const getSafeTime = (d: string) => d ? new Date(d).getTime() || 0 : 0;
        const prevTime = getSafeTime(prev.lastModified);
        const remoteTime = getSafeTime(remoteState.lastModified);

        // 아이템 병합: 항상 두 쪽 모두 합치되, 더 최신인 쪽이 우선
        const mergedItems = remoteTime >= prevTime
          ? { ...prev.items, ...remoteState.items }
          : { ...remoteState.items, ...prev.items };

        // summaries 병합
        const mergedSummaries = remoteTime >= prevTime
          ? { ...prev.summaries, ...remoteState.summaries }
          : { ...remoteState.summaries, ...prev.summaries };

        // handovers 병합: 항상 양쪽 다 유지 (인수인계는 누락 없도록)
        const mergedHandovers = { ...remoteState.handovers, ...prev.handovers };

        // 점검자 결정: 어느 쪽이든 실제 이름이 있으면 우선 사용
        // 원격 실제이름 > 로컬 실제이름 > 기본값 순
        const remoteInspector = remoteState.inspector && remoteState.inspector !== '점검자' ? remoteState.inspector : null;
        const localInspector = prev.inspector && prev.inspector !== '점검자' ? prev.inspector : null;
        const resolvedInspector = (remoteTime >= prevTime ? remoteInspector : localInspector)
          ?? (remoteTime >= prevTime ? localInspector : remoteInspector)
          ?? '점검자';

        const finalState = {
          ...prev,
          ...(remoteTime >= prevTime ? remoteState : prev),
          items: mergedItems,
          summaries: mergedSummaries,
          handovers: mergedHandovers,
          inspector: resolvedInspector
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
    // NFC 주소(업무용):
    // nfc=11~52 범위로 접속한 경우는 직접 접속으로 간주 → 뽌로가기 버튼 숨김
    if (nfcParam) {
      const nNum = parseInt(nfcParam, 10);
      if (!isNaN(nNum) && nNum >= 11 && nNum <= 59) {
        setIsNfcDirect(true);
      }
    }
    
    // ?admin=파트명 주소 처리: 파트별 관리자 전용 페이지
    const adminParam = params.get('admin') as DepartmentId | null;
    if (adminParam && ['facilities', 'reception', 'cleaning', 'food', 'snack'].includes(adminParam)) {
      setDeptAdminDept(adminParam);
      setCurrentView('deptAdmin');
      return;
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

      // 점검자 결정 우선순위:
      // 1위: 현재 state의 점검자가 이미 실제 이름인 경우 그대로 유지
      // 2위: deptStatus에 저장된 점검자
      // 3위: 기본값 '점검자'
      const localInspector = state.inspector;
      const currentStatus = getDeptInspectionStatus(state.date || todayStr, dept, roleName);

      let activeInspector = '점검자';
      if (localInspector && localInspector !== '점검자') {
        // 이미 실제 이름이 설정되어 있으면 그대로 유지
        activeInspector = localInspector;
      } else if (currentStatus.status !== 'none' && currentStatus.inspector && currentStatus.inspector !== '점검자') {
        activeInspector = currentStatus.inspector;
      }

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
    showToast("⏳ 이미지 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const baseName = `${state.date}_${deptName}_${state.inspector || '점검자'}`;

    try {
      const contentEl = document.getElementById('a4PageContent')!;
      const raw = await html2canvas(contentEl, { scale: 2, backgroundColor: '#ffffff' });
      
      const link = document.createElement('a');
      link.download = `${baseName}.jpg`;
      link.href = raw.toDataURL('image/jpeg', 0.95);
      link.click();

      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.opacity = '0';
      showToast("✅ 통합본 이미지 다운로드 완료");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.opacity = '0';
      alert("이미지 생성 오류: " + err);
    }
  };

  const downloadA4MultipagePDF = async () => {
    setIsSaveModalOpen(false);
    showToast("⏳ PDF 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-100';
    container.style.opacity = '1';

    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const baseName = `${state.date}_${deptName}_${state.inspector || '점검자'}`;

    try {
      const coverEl = document.getElementById('a4PageCover')!;
      const contentEls = document.querySelectorAll('.a4-content-page');

      const canvasCover = await html2canvas(coverEl, { scale: 2, backgroundColor: '#ffffff' });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvasCover.width / 2, canvasCover.height / 2]
      });
      pdf.addImage(canvasCover.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvasCover.width / 2, canvasCover.height / 2);

      for (let i = 0; i < contentEls.length; i++) {
        const el = contentEls[i] as HTMLElement;
        const raw = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
        pdf.addPage();
        pdf.addImage(raw.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, raw.width / 2, raw.height / 2);
      }

      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.opacity = '0';

      pdf.save(`${baseName}.pdf`);
      showToast("✅ PDF 다운로드 완료");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.opacity = '0';
      alert("PDF 생성 오류: " + err);
    }
  };

  // 문서번호 발급 헬퍼 함수
  const getDocumentNumber = (dateStr: string, deptName: string, increment: boolean = false) => {
    const dStr = dateStr || new Date().toISOString().split('T')[0];
    const yy = dStr.slice(2, 4);
    const mm = dStr.slice(5, 7);
    const dd = dStr.slice(8, 10);
    const yymmdd = `${yy}${mm}${dd}`;
    const key = `doc_seq_${yymmdd}_${deptName}`;
    const seq = parseInt(localStorage.getItem(key) || '1');
    if (increment) {
      localStorage.setItem(key, String(seq + 1));
    }
    return `BOWS-${deptName}-${yymmdd}-${String(seq).padStart(2, '0')}`;
  };

  // Kakao Submit Logic (텍스트 전용)
  const handleSubmitToKakao = async () => {
    const deptName = (selectedDept && DEPT_NAMES[selectedDept]) || '점검';
    const docNum = getDocumentNumber(state.date || todayStr, deptName, true); // 카톡 전송 시에만 +1 증가

    showToast("⏳ 카톡 전송 데이터 준비 중...");
    
    // 비동기 closure 이슈 방지: 로컬 스토리지에서 가장 최신 상태를 강제로 가져와서 저장
    let latestState = state;
    try {
      const raw = localStorage.getItem(getStorageKey(state.date || todayStr));
      if (raw) {
        latestState = JSON.parse(raw);
      }
    } catch (e) { console.error(e); }
    
    saveInspectionToSupabase(latestState);
    
    const markCompleted = () => {
      if (selectedDept) {
        updateDeptInspectionStatus(state.date || todayStr, selectedDept, state.roleName, 'completed', state.inspector);
      }
    };

    let msg = `${deptName} 점검 보고_${latestState.date || todayStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `❍ 파트명: ${deptName}\n`;
    msg += `❍ 점검자: ${latestState.inspector || '점검자'}\n`;
    msg += `❍ 문서번호: ${docNum}\n`;
    msg += `❍ 기록시간: ${latestState.lastModified ? latestState.lastModified.split(' ')[1] || latestState.lastModified : '-'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    availableTabs.forEach((tid) => {
      const tabInfo = TAB_INFO[tid];
      if (!tabInfo) return;
      const sections = getEffectiveChecklistData(tid, adminSettings.customChecklists);
      const items = sections.flatMap((s) => s.items);

      let n = 0;
      let i = 0;
      const issues: string[] = [];
      const notes: string[] = [];

      items.forEach((item: CheckItem) => {
        const itemState = latestState.items[item.id] || {};
        const hasNote = itemState.note && itemState.note.trim() !== '';

        if (item.type === 'filter' || item.type === 'pump') {
          const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';
          if (isIssue) {
            i++;
            issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${itemState.note || '상세 없음'}`);
          } else {
            if (itemState.pressure !== undefined || itemState.sound !== undefined || itemState.backwash !== undefined || itemState.hairCatcher !== undefined) n++;
            if (hasNote) notes.push(`  ℹ️ [참고] ${item.text}: ${itemState.note}`);
          }
        } else if (item.type === 'temp') {
          const isInspected = itemState.tempDawn !== undefined || itemState.tempMorning !== undefined || itemState.tempAfternoon !== undefined;
          if (isInspected) n++;
          if (hasNote) notes.push(`  ℹ️ [참고] ${item.text}: ${itemState.note}`);
        } else {
          const st = itemState.status;
          if (st === 'normal') {
            n++;
            if (hasNote) notes.push(`  ℹ️ [참고] ${item.text}: ${itemState.note}`);
          } else if (st === 'issue') {
            i++;
            issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${itemState.note || '상세 없음'}`);
          } else if (hasNote) {
            // 기록은 안 했지만 특이사항만 적은 경우
            notes.push(`  ℹ️ [참고] ${item.text}: ${itemState.note}`);
          }
        }
      });

      msg += `❏ ${tabInfo.name} (정상/기록 ${n} / 이상 ${i})\n`;
      msg += issues.length > 0 ? `${issues.join('\n')}\n` : `  ✅ 전 항목 '이상무 (O)' 적합\n`;
      if (notes.length > 0) {
        msg += `${notes.join('\n')}\n`;
      }
    });

    // 인수인계 사항
    msg += `\n❏ 인수인계 및 관리자 지시 사항\n`;
    let allHandovers: any[] = [];
    if (selectedDept && latestState.roleName) {
      const keysToCheck = availableTabs.length > 1 
        ? availableTabs.map(t => `${selectedDept}_${latestState.roleName}_${t}`)
        : [`${selectedDept}_${latestState.roleName}`];

      keysToCheck.forEach(key => {
        if (latestState.handovers && latestState.handovers[key]) {
          allHandovers = [...allHandovers, ...latestState.handovers[key]];
        }
      });
    }

    if (allHandovers.length > 0) {
      allHandovers.forEach(h => {
        const statusText = h.status === 'completed' ? '완료' : h.status === 'incomplete' ? '미완료' : '';
        msg += `   ✅ ${h.text} [${statusText}]\n`;
        if (h.note) msg += `     ↳ 사유: ${h.note}\n`;
      });
    } else {
      msg += `   - 없음 -\n`;
    }

    // 종합 의견
    msg += `\n❏ 종합 의견\n`;
    let hasSummary = false;
    availableTabs.forEach(tid => {
      const sumText = latestState.summaries[tid];
      if (sumText) {
        msg += `   - [${TAB_INFO[tid].name}] ${sumText}\n`;
        hasSummary = true;
      }
    });
    if (!hasSummary) {
      msg += `   - 없음 -\n`;
    }

    msg += `\n이상.`;

    // 1단계: 모바일 Web Share API
    let sharedSuccessfully = false;
    if (navigator.canShare && navigator.canShare({ text: msg })) {
      try {
        await navigator.share({
          title: `${deptName} 점검 보고`,
          text: msg
        });
        sharedSuccessfully = true;
      } catch (shareErr) {
        console.warn("텍스트 공유 실패 또는 사용자 취소:", shareErr);
      }
    }

    // 2단계: 실패 시 클립보드 복사
    if (!sharedSuccessfully) {
      try {
        await navigator.clipboard.writeText(msg);
        alert(`📋 요약 보고서가 복사되었습니다!\n\n카카오톡에 [붙여넣기] 해주세요.`);
      } catch (clipErr) {
        console.warn("클립보드 복사 실패:", clipErr);
        alert(`공유 기능을 지원하지 않는 브라우저입니다.\n아래 텍스트를 복사해주세요:\n\n${msg}`);
      }
    }

    markCompleted();
    showToast("✅ 요약 보고서 복사/공유 완료");
  };

  if (currentView === 'main') {
    return (
      <>
        <MainIndex 
          onSelectDepartment={handleSelectDepartment} 
          onOpenPanel={handleOpenPanel} 
          adminSettings={adminSettings}
        />
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

  // ?admin=파트명 접속: 파트별 관리자 전용 페이지
  if (currentView === 'deptAdmin' && deptAdminDept) {
    return <DeptAdminPage dept={deptAdminDept} />;
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
        hideBack={isNfcDirect}
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
        handovers={[
          ...(state.handovers[`${selectedDept}_${state.roleName}`] || []),
          ...(state.handovers[`${selectedDept}_${state.roleName}_${currentTab}`] || [])
        ]}
        onSetHandoverStatus={(id, st) => {
          updateStateAndSave((p) => {
            const oldKey = `${selectedDept}_${state.roleName}`;
            const newKey = `${selectedDept}_${state.roleName}_${currentTab}`;
            let hoOld = p.handovers[oldKey] || [];
            let hoNew = p.handovers[newKey] || [];
            if (hoOld.some(h => h.id === id)) {
              hoOld = hoOld.map(h => h.id === id ? { ...h, status: st, note: st === 'incomplete' ? h.note : '' } : h);
            } else {
              hoNew = hoNew.map(h => h.id === id ? { ...h, status: st, note: st === 'incomplete' ? h.note : '' } : h);
            }
            return { ...p, handovers: { ...p.handovers, [oldKey]: hoOld, [newKey]: hoNew } };
          });
        }}
        onSaveHandoverNote={(id, note) => {
          updateStateAndSave((p) => {
            const oldKey = `${selectedDept}_${state.roleName}`;
            const newKey = `${selectedDept}_${state.roleName}_${currentTab}`;
            let hoOld = p.handovers[oldKey] || [];
            let hoNew = p.handovers[newKey] || [];
            if (hoOld.some(h => h.id === id)) {
              hoOld = hoOld.map(h => h.id === id ? { ...h, note } : h);
            } else {
              hoNew = hoNew.map(h => h.id === id ? { ...h, note } : h);
            }
            return { ...p, handovers: { ...p.handovers, [oldKey]: hoOld, [newKey]: hoNew } };
          });
        }}
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

      {/* 백그라운드에서 A4 PDF/이미지 렌더링용 숨김 영역 */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <A4PrintDocument 
          state={state}
          departmentId={selectedDept}
          departmentName={selectedDept ? DEPT_NAMES[selectedDept] : '점검'}
          availableTabs={availableTabs}
        />
      </div>

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
