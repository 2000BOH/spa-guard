import React from 'react';
import type { AppState, TabId, CheckItem, DepartmentId } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';

interface A4PrintDocumentProps {
  state: AppState;
  departmentId: DepartmentId | null;
  departmentName: string;
  availableTabs: TabId[];
}

type FlatItem = {
  tabInfo: any;
  item: CheckItem;
  tid: string;
};

export const A4PrintDocument: React.FC<A4PrintDocumentProps> = ({ state, departmentId, departmentName, availableTabs }) => {
  const checkDateDot = state.date.replace(/-/g, '.');

  // 1. Calculate stats for the cover page
  let cntN = 0;
  let cntI = 0;
  let totalItems = 0;

  const allRows: FlatItem[] = [];

  availableTabs.forEach(tid => {
    const tabInfo = TAB_INFO[tid];
    const sections = CHECKLIST_DATA[tid] || [];
    const items = sections.flatMap(s => s.items);
    totalItems += items.length;

    items.forEach((item: CheckItem) => {
      allRows.push({ tabInfo, item, tid });

      const itemState = state.items[item.id] || {};
      if (item.type === 'filter' || item.type === 'pump') {
        const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';
        if (isIssue) cntI++;
        else if (itemState.pressure !== undefined || itemState.sound !== undefined || itemState.backwash !== undefined || itemState.hairCatcher !== undefined) cntN++;
      } else if (item.type === 'temp') {
        const isInspected = itemState.tempDawn !== undefined || itemState.tempMorning !== undefined || itemState.tempAfternoon !== undefined;
        if (isInspected) cntN++;
      } else {
        const st = itemState.status;
        if (st === 'normal') cntN++;
        else if (st === 'issue') cntI++;
      }
    });
  });

  const cntP = totalItems - (cntN + cntI);

  // 2. Extract Summaries and Handovers
  let summaryArr: string[] = [];
  availableTabs.forEach(tid => {
    const txt = state.summaries[tid];
    if (txt && TAB_INFO[tid]) summaryArr.push(`• [${TAB_INFO[tid].name}] ${txt}`);
  });

  const overallSummary = summaryArr.length > 0 
    ? summaryArr.join('\n') 
    : '• 전 구역 설비 및 위생 상태 양호 (특이사항 없음)';

  let allHandovers: any[] = [];
  if (departmentId) {
    const keysToCheck = availableTabs.length > 1 
      ? availableTabs.map(t => `${departmentId}_${state.roleName}_${t}`)
      : [`${departmentId}_${state.roleName}`];

    keysToCheck.forEach(key => {
      if (state.handovers && state.handovers[key]) {
        allHandovers = [...allHandovers, ...state.handovers[key]];
      }
    });
  }

  // 3. Pagination Logic (Fixed Page Counts based on Department)
  let targetContentPages = 2; // Default for Reception, Cleaning, Food, Snack
  if (departmentId === 'facilities') {
    targetContentPages = 4;
  }

  // DEBUG LOGGING
  const debugText = `DEBUG: deptId=${departmentId}, target=${targetContentPages}, rows=${allRows.length}`;

  const pages: { rows: FlatItem[], isLastPage: boolean }[] = [];
  let startIndex = 0;

  for (let i = 0; i < targetContentPages; i++) {
    // Distribute rows evenly across pages, giving extra rows to earlier pages if not perfectly divisible
    const currentChunkSize = Math.floor(allRows.length / targetContentPages) + (i < (allRows.length % targetContentPages) ? 1 : 0);
    const chunkRows = allRows.slice(startIndex, startIndex + currentChunkSize);
    
    pages.push({
      rows: chunkRows,
      isLastPage: i === targetContentPages - 1
    });
    
    startIndex += currentChunkSize;
  }

  // 4. Render Row Function
  const renderRow = (row: FlatItem, idx: number, arr: FlatItem[]) => {
    const { item, tabInfo, tid } = row;
    const itemState = state.items[item.id] || {};

    let rowSpan = 1;
    let isFirstInGroup = false;

    if (idx === 0 || arr[idx - 1].tid !== tid) {
      isFirstInGroup = true;
      for (let i = idx + 1; i < arr.length; i++) {
        if (arr[i].tid === tid) rowSpan++;
        else break;
      }
    }

    if (item.type === 'temp') {
      const target = itemState.targetTemp !== undefined && itemState.targetTemp !== null ? itemState.targetTemp : 10.0;
      const d = itemState.tempDawn ?? null;
      const m = itemState.tempMorning ?? null;
      const a = itemState.tempAfternoon ?? null;

      const formatTemp = (val: number | null) => {
        if (val === null) return '-';
        let diffStr = '';
        if (target !== null && typeof val === 'number') {
          const diff = Math.round((val - target) * 10) / 10;
          diffStr = diff > 0 ? `(+${diff.toFixed(1)})` : diff < 0 ? `(${diff.toFixed(1)})` : `(±0.0)`;
        }
        return `${val}℃${diffStr}`;
      };

      return (
        <tr key={item.id}>
          {isFirstInGroup && (
            <td 
              className="a4-field-cell" 
              rowSpan={rowSpan}
              dangerouslySetInnerHTML={{ __html: tabInfo.htmlName.replace('\n', '<br>') }}
            />
          )}
          <td className="a4-item-title" style={{ whiteSpace: 'nowrap' }}>• {item.text}</td>
          <td className="center" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
            새벽:{formatTemp(d)} | 오전:{formatTemp(m)} | 오후:{formatTemp(a)}
          </td>
          <td style={{ fontSize: '11.5px' }}>
            기준:{target !== null ? `${target}℃` : '10.0℃'}
            {itemState.note ? ` (${itemState.note})` : ''}
          </td>
        </tr>
      );
    }

    if (item.type === 'filter') {
      const p = itemState.pressure !== undefined && itemState.pressure !== null ? `${itemState.pressure.toFixed(1)}bar` : '미선택';
      const bw = itemState.backwash === 2 ? '2회 최종완료' : itemState.backwash === 1 ? '1회 완료' : '미실시';
      const hc = itemState.hairCatcher === 2 ? '2회 완료' : itemState.hairCatcher === 1 ? '1회 완료' : '미실시';
      const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';

      return (
        <tr key={item.id}>
          {isFirstInGroup && (
            <td 
              className="a4-field-cell" 
              rowSpan={rowSpan}
              dangerouslySetInnerHTML={{ __html: tabInfo.htmlName.replace('\n', '<br>') }}
            />
          )}
          <td className="a4-item-title" style={{ whiteSpace: 'nowrap' }}>• {item.text}</td>
          <td className="center">
            <span className={isIssue ? 'a4-res-issue' : 'a4-res-ok'}>
              {isIssue ? '이상 발생' : '정상'}
            </span>
            <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', whiteSpace: 'nowrap' }}>
              압력:{p} | 역세척:{bw}
            </div>
          </td>
          <td>
            <span style={{ fontSize: '12px' }}>
              헤어캐처:{hc}
              {itemState.note ? ` (${itemState.note})` : ''}
            </span>
          </td>
        </tr>
      );
    }

    if (item.type === 'pump') {
      const hc = itemState.hairCatcher === 2 ? '2회 완료' : itemState.hairCatcher === 1 ? '1회 완료' : '미실시';
      const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';

      return (
        <tr key={item.id}>
          {isFirstInGroup && (
            <td 
              className="a4-field-cell" 
              rowSpan={rowSpan}
              dangerouslySetInnerHTML={{ __html: tabInfo.htmlName.replace('\n', '<br>') }}
            />
          )}
          <td className="a4-item-title" style={{ whiteSpace: 'nowrap' }}>• {item.text}</td>
          <td className="center">
            <span className={isIssue ? 'a4-res-issue' : 'a4-res-ok'}>
              {isIssue ? '이상 발생' : '양호'}
            </span>
          </td>
          <td>
            <span style={{ fontSize: '12px' }}>
              헤어캐처:{hc}
              {itemState.note ? ` (${itemState.note})` : ''}
            </span>
          </td>
        </tr>
      );
    }

    return (
      <tr key={item.id}>
        {isFirstInGroup && (
          <td 
            className="a4-field-cell" 
            rowSpan={rowSpan}
            dangerouslySetInnerHTML={{ __html: tabInfo.htmlName.replace('\n', '<br>') }}
          />
        )}
        <td className="a4-item-title" style={{ whiteSpace: 'nowrap' }}>• {item.text}</td>
        <td className="center">
          {itemState.status === 'normal' && <span className="a4-res-ok">이상무 (O)</span>}
          {itemState.status === 'issue' && <span className="a4-res-issue">이상 (X)</span>}
          {(!itemState.status || itemState.status === null) && <span className="a4-res-pending">미점검</span>}
        </td>
        <td>
          {itemState.status === 'issue' && itemState.note && (
            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12.5px' }}>{itemState.note}</span>
          )}
          {itemState.status === 'normal' && (
            <span style={{ color: '#059669', fontSize: '12.5px' }}>적합</span>
          )}
          {(!itemState.status || itemState.status === null) && (
            <span style={{ color: '#9ca3af', fontSize: '12.5px' }}>-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div id="printDocumentHiddenContainer">
      {/* 0페이지 (표지) */}
      <div 
        className="a4-page-box" 
        id="a4PageCover" 
        style={{
          width: '800px',
          height: '1131px', // A4 고정 크기 적용
          background: '#ffffff',
          color: '#0f172a',
          border: '4px solid #1e293b',
          borderRadius: '0px',
          padding: '48px 48px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #0f172a', paddingBottom: '16px', marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="SPA GUARD LOGO" style={{ height: '52px', width: 'auto', borderRadius: '6px' }} />
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px' }}>
              블루오션 웰니스 스파
            </span>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #bfdbfe' }}>
            인증코드: {state.securityCode}
          </span>
        </div>

        <div style={{ textAlign: 'center', margin: 'auto 0' }}>
          <h1 style={{ fontSize: '64px', fontWeight: 900, color: '#0f172a', letterSpacing: '4px', textAlign: 'center' }}>
            {departmentName} 점검일지
          </h1>
          <div style={{ fontSize: '12px', color: 'red' }}>{debugText}</div>
        </div>

        <div style={{ background: '#f8fafc', border: '3px solid #cbd5e1', borderRadius: '16px', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: '#475569' }}>점 검 일 :</span>
            <span style={{ fontSize: '48px', fontWeight: 900, color: '#1d4ed8' }}>{state.date}</span>
          </div>
          <div style={{ height: '2px', background: '#cbd5e1' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: '#475569' }}>점 검 자 :</span>
            <span style={{ fontSize: '48px', fontWeight: 900, color: '#0f172a' }}>{state.inspector || '점검자'}</span>
          </div>
        </div>

        <div style={{ background: cntI > 0 ? '#fef2f2' : '#f0fdf4', border: `4px solid ${cntI > 0 ? '#fca5a5' : '#86efac'}`, borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: cntI > 0 ? '#dc2626' : '#15803d' }}>
            {cntI > 0 ? `이상 발생 (${cntI}건)` : `전 항목 이상무 (정상 적합 완료)`}
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>
            정상 {cntN}건 / 미점검 {cntP}건
          </span>
        </div>
      </div>

      {/* 분할된 다중 페이지 내용 영역 */}
      {pages.map((page, pIdx) => (
        <div key={pIdx} className="a4-page-box a4-content-page" style={{ width: '800px', height: '1131px', minHeight: '1131px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            {pIdx === 0 && (
              <>
                <div className="a4-header">
                  <h1 className="a4-title">{departmentName} 점검일지</h1>
                </div>

                <div className="a4-subhead" style={{ marginTop: '4px' }}>1. 시 설 현 황 및 점 검 자</div>
                <table className="a4-table" style={{ marginBottom: '14px' }}>
                  <tbody>
                    <tr>
                      <th style={{ width: '15%' }}>업 소 명</th>
                      <td style={{ width: '35%' }}>블루오션 웰니스 스파</td>
                      <th style={{ width: '18%' }}>인 증 코 드</th>
                      <td style={{ width: '32%', fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: '11px' }}>
                        {state.securityCode}
                      </td>
                    </tr>
                    <tr>
                      <th>점검일시</th>
                      <td>{checkDateDot}</td>
                      <th>점 검 자</th>
                      <td style={{ fontWeight: 700, color: '#1d4ed8' }}>{state.inspector || '점검자'}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            <div className="a4-subhead">
              2. 구역별 점검사항 및 결과 {pages.length > 1 ? `(${pIdx + 1}/${pages.length})` : ''}
            </div>
            
            {page.rows.length > 0 ? (
              <table className="a4-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%', whiteSpace: 'nowrap' }}>점검분야</th>
                    <th style={{ width: '37%', whiteSpace: 'nowrap' }}>점 검 항 목</th>
                    <th style={{ width: '21%', whiteSpace: 'nowrap' }}>점검결과</th>
                    <th style={{ width: '30%', whiteSpace: 'nowrap' }}>비고 및 조치</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row, idx, arr) => renderRow(row, idx, arr))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', background: '#f9fafb', border: '1px solid #e5e7eb', marginTop: '10px' }}>
                점검 항목이 모두 앞 페이지에 출력되었습니다.
              </div>
            )}

            {page.isLastPage && (
              <>
                {/* 인수인계 섹션 */}
                {allHandovers.length > 0 && (
                  <>
                    <div className="a4-subhead" style={{ marginTop: '16px' }}>3. 인수인계 및 특이사항</div>
                    <div className="a4-footer-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a', fontSize: '13px', lineHeight: '1.5' }}>
                        {allHandovers.map(h => (
                          <li key={h.id} style={{ marginBottom: '6px' }}>
                            <strong style={{ marginRight: '6px' }}>
                              {h.status === 'completed' ? '[완료]' : h.status === 'incomplete' ? '[미완료]' : ''}
                            </strong>
                            {h.text}
                            {h.note && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px', paddingLeft: '10px' }}>- 사유: {h.note}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* 종합의견 섹션 */}
                <div className="a4-subhead" style={{ marginTop: '16px' }}>
                  {allHandovers.length > 0 ? '4. 종합 의견' : '3. 종합 의견 및 특이사항'}
                </div>
                <div className="a4-footer-box">
                  <div style={{ color: '#374151', minHeight: '20px', whiteSpace: 'pre-wrap' }}>
                    {overallSummary}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280', borderTop: '1px dashed #d1d5db', paddingTop: '4px' }}>
                    ⏰ <b>기록일시:</b> <span>{state.lastModified || '-'} (KST)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="a4-sign-row" style={{ justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '16px' }}>
            <div style={{ fontFamily: 'Cinzel, sans-serif', fontWeight: 800, letterSpacing: '1.5px', color: '#1e3a8a', fontSize: '14px' }}>
              BLUE OCEAN WELLNESS SPA - Page {pIdx + 1}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
