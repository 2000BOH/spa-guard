import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import type { AppState, TabId, StatusType } from './types';
import { TAB_INFO, CHECKLIST_DATA } from './data/checklistData';
import { Header } from './components/Header';
import { MetaStrip } from './components/MetaStrip';
import { CheckListView } from './components/CheckListView';
import { A4PrintDocument } from './components/A4PrintDocument';
import { SaveModal, ShortcutModal, Toast } from './components/Modals';
import { saveInspectionToSupabase } from './lib/supabase';

const STORAGE_KEY = 'spa_multi_facility_data_v9';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('tab2');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [state, setState] = useState<AppState>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    return {
      storeName: '스파랜드',
      date: `${yyyy}-${mm}-${dd}`,
      inspector: '점검자',
      items: {},
      summaries: { tab1: '', tab2: '', tab3: '', tab4: '' },
      securityCode: '',
      lastModified: ''
    };
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 1. LocalStorage & Security Log Helper
  const generateSecurityLog = (items: Record<string, { status: StatusType; note: string }>, inspector: string) => {
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

  // Load from LocalStorage on initial render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setState((prev) => ({
          ...prev,
          ...saved
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync state to LocalStorage and update Security Log
  const updateStateAndSave = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      const secLog = generateSecurityLog(next.items, next.inspector);
      const finalState = {
        ...next,
        ...secLog
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalState));
      } catch (e) {
        console.error(e);
      }
      return finalState;
    });
  };

  // 2. Handlers
  const handleSetStatus = (id: string, status: StatusType) => {
    updateStateAndSave((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [id]: {
          status,
          note: prev.items[id]?.note || ''
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
          status: prev.items[id]?.status || null,
          note
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

  // 3. Counts & Progress
  const activeSections = CHECKLIST_DATA[currentTab] || [];
  const activeItems = activeSections.flatMap((s) => s.items);

  let cntN = 0;
  let cntI = 0;
  let done = 0;

  activeItems.forEach((item) => {
    const st = state.items[item.id]?.status;
    if (st === 'normal') { cntN++; done++; }
    else if (st === 'issue') { cntI++; done++; }
  });

  const total = activeItems.length || 1;
  const cntP = total - done;
  const progressPct = Math.round((done / total) * 100);

  // 4. Image Capture & PDF Export Logic
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
      link1.download = `자율점검표_${state.storeName || '스파랜드'}_${state.date}_1페이지(앞면).jpg`;
      link1.href = canvas1.toDataURL('image/jpeg', 0.95);
      link1.click();

      setTimeout(async () => {
        const canvas2 = await html2canvas(page2El, { scale: 2, backgroundColor: '#ffffff' });
        const link2 = document.createElement('a');
        link2.download = `자율점검표_${state.storeName || '스파랜드'}_${state.date}_2페이지(뒷면).jpg`;
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

      pdf.save(`자율점검표_${state.storeName || '스파랜드'}_${state.date}_A4.pdf`);
      showToast("✅ A4 2페이지 PDF 문서가 다운로드되었습니다.");
    } catch (err) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      alert("PDF 생성 오류: " + err);
    }
  };

  // 5. Kakao & Supabase Submit Logic
  const handleSubmitToKakao = async () => {
    showToast("⏳ 데이터 DB 보관 및 카톡 전송 준비 중...");

    // Supabase DB에 점검 로그 보관
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

      items.forEach((item) => {
        const itemState = state.items[item.id];
        const st = itemState?.status;
        const note = itemState?.note;

        if (st === 'normal') n++;
        else if (st === 'issue') {
          i++;
          issues.push(`  ⚠️ [이상] ${item.text}\n    ↳ 조치: ${note || '상세 없음'}`);
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
        storeName={state.storeName}
        checkDate={state.date}
        inspector={state.inspector}
        cntN={cntN}
        cntI={cntI}
        cntP={cntP}
        onChangeStoreName={(val) => updateStateAndSave((p) => ({ ...p, storeName: val }))}
        onChangeCheckDate={(val) => updateStateAndSave((p) => ({ ...p, date: val }))}
        onChangeInspector={(val) => updateStateAndSave((p) => ({ ...p, inspector: val }))}
      />

      <CheckListView
        currentTab={currentTab}
        itemsState={state.items}
        summaryText={state.summaries[currentTab]}
        onSetStatus={handleSetStatus}
        onSaveNote={handleSaveNote}
        onChangeSummary={handleChangeSummary}
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
