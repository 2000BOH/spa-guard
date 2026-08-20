import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import type { AppState, TabId, StatusType, ItemState, CheckItem } from './types';
import { TAB_INFO, CHECKLIST_DATA } from './data/checklistData';
import { Header } from './components/Header';
import { MetaStrip } from './components/MetaStrip';
import { CheckListView } from './components/CheckListView';
import { A4PrintDocument } from './components/A4PrintDocument';
import { SaveModal, ShortcutModal, Toast } from './components/Modals';
import { saveInspectionToSupabase } from './lib/supabase';

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
  const [currentTab, setCurrentTab] = useState<TabId>('tab2');
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
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '' },
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
          summaries: saved.summaries || { tab1: '', tab2: '', tab3: '', tab4: '' },
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
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '' },
      securityCode: '',
      lastModified: ''
    };
  };

  useEffect(() => {
    const initialData = loadDateData(todayStr);
    const sec = generateSecurityLog(initialData.items, initialData.inspector);
    setState({
      ...initialData,
      ...sec
    });
  }, []);

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
      return finalState;
    });
  };

  const handleDateChange = (newDate: string) => {
    const loaded = loadDateData(newDate);
    const sec = generateSecurityLog(loaded.items, loaded.inspector);
    setState({
      ...loaded,
      ...sec
    });
    if (newDate < yesterdayStr) {
      showToast("🔒 과거 기록 조회 모드 (수정 불가)");
    } else {
      showToast(`📅 ${newDate} 점검표 불러옴`);
    }
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

  const handleUpdateTab4Item = (id: string, field: keyof ItemState, value: any) => {
    updateStateAndSave((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: {
          ...prev.items[id],
          [field]: value
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
    showToast("⏳ A4 규격 2장 이미지 생성 중...");

    const container = document.getElementById('printDocumentHiddenContainer');
    if (!container) return;
    container.style.position = 'relative';
    container.style.left = '0';

    try {
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvas1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const link1 = document.createElement('a');
      link1.download = `자율점검표_블루오션웰니스스파_${state.date}_1페이지(앞면).jpg`;
      link1.href = canvas1.toDataURL('image/jpeg', 0.95);
      link1.click();

      setTimeout(async () => {
        const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });
        const link2 = document.createElement('a');
        link2.download = `자율점검표_블루오션웰니스스파_${state.date}_2페이지(뒷면).jpg`;
        link2.href = canvas2.toDataURL('image/jpeg', 0.95);
        link2.click();

        container.style.position = 'absolute';
        container.style.left = '-9999px';
        showToast("✅ 앞면 / 뒷면 JPG 2장이 다운로드되었습니다.");
      }, 350);
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

      pdf.save(`자율점검표_블루오션웰니스스파_${state.date}_A4.pdf`);
      showToast("✅ A4 2페이지 PDF 문서가 다운로드되었습니다.");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      alert("PDF 생성 오류: " + err);
    }
  };

  // Kakao & Supabase Submit Logic
  const handleSubmitToKakao = async () => {
    showToast("⏳ 데이터 DB 보관 및 카톡 전송 준비 중...");

    saveInspectionToSupabase(state).then((res) => {
      if (res.success) {
        console.log('Supabase Saved Successfully');
      }
    });

    let msg = `{시설 점검 보고}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📅 점검일자: ${state.date}\n`;
    msg += `👤 점검자: ${state.inspector || '점검자'}\n`;
    msg += `⏰ 기록시간: ${state.lastModified}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    (['tab1', 'tab2', 'tab3', 'tab4'] as TabId[]).forEach((tid) => {
      const tabInfo = TAB_INFO[tid];
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
        } else {
          const st = itemState.status;
          if (st === 'normal') n++;
          else if (st === 'issue') {
            i++;
            issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${itemState.note || '상세 없음'}`);
          }
        }
      });

      msg += `■ ${tabInfo.name} (정상 ${n} / 이상 ${i})\n`;
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
      const page1El = document.getElementById('a4Page1')!;
      const page2El = document.getElementById('a4Page2')!;

      const canvas1 = await html2canvas(page1El, { scale: 2, backgroundColor: '#ffffff' });
      const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });

      container.style.position = 'absolute';
      container.style.left = '-9999px';

      const blob1 = await new Promise<Blob>((resolve) => canvas1.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));
      const blob2 = await new Promise<Blob>((resolve) => canvas2.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));

      const file1 = new File([blob1], `자율점검표_${state.date}_1페이지(앞면).jpg`, { type: 'image/jpeg' });
      const file2 = new File([blob2], `자율점검표_${state.date}_2페이지(뒷면).jpg`, { type: 'image/jpeg' });

      const filesArray = [file1, file2];

      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          title: '{시설 점검 보고}',
          text: msg,
          files: filesArray
        });
        showToast("📲 카카오톡 단체방을 선택하여 전송하세요!");
        return;
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
        alert("📋 요약 보고서가 복사되었고 점검표 이미지 2장이 다운로드되었습니다!\n\n카카오톡 단체방에 [붙여넣기]하고 다운로드된 사진 2장을 함께 올려주세요.");
      });
    } catch (e) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      console.error(e);
    }
  };

  return (
    <div>
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        progressPct={progressPct}
        onOpenShortcutModal={() => setIsShortcutModalOpen(true)}
      />

      <MetaStrip
        checkDate={state.date}
        inspector={state.inspector}
        cntN={cntN}
        cntI={cntI}
        cntP={cntP}
        isReadOnly={isReadOnly}
        onChangeCheckDate={handleDateChange}
        onChangeInspector={(val) => updateStateAndSave((p) => ({ ...p, inspector: val }))}
      />

      <CheckListView
        currentTab={currentTab}
        itemsState={state.items}
        summaryText={state.summaries[currentTab]}
        isReadOnly={isReadOnly}
        onSetStatus={handleSetStatus}
        onSaveNote={handleSaveNote}
        onChangeSummary={handleChangeSummary}
        onUpdateTab4Item={handleUpdateTab4Item}
      />

      <footer className="bottom-bar">
        <button className="btn-save-action" onClick={() => setIsSaveModalOpen(true)}>
          <span>💾</span>
          <span>A4 분할 저장</span>
        </button>
        <button className="btn-submit-kakao" onClick={handleSubmitToKakao}>
          <span>💬</span>
          <span>카톡방 자동 제출</span>
        </button>
      </footer>

      <A4PrintDocument state={state} />

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
