import React from 'react';
import type { AppState, TabId, CheckItem } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';

interface A4PrintDocumentProps {
  state: AppState;
}

export const A4PrintDocument: React.FC<A4PrintDocumentProps> = ({ state }) => {
  const checkDateDot = state.date.replace(/-/g, '.');

  // Counts Calculation for Cover Page
  let cntN = 0;
  let cntI = 0;

  (['tab1', 'tab2', 'tab3', 'tab4', 'tab5'] as TabId[]).forEach(tid => {
    const sections = CHECKLIST_DATA[tid] || [];
    const items = sections.flatMap(s => s.items);

    items.forEach((item: CheckItem) => {
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

  let summaryArr: string[] = [];
  (['tab1', 'tab2', 'tab3', 'tab4', 'tab5'] as TabId[]).forEach(tid => {
    const txt = state.summaries[tid];
    if (txt && TAB_INFO[tid]) summaryArr.push(`• [${TAB_INFO[tid].name}] ${txt}`);
  });

  const overallSummary = summaryArr.length > 0 
    ? summaryArr.join('\n') 
    : '• 전 구역 설비 및 위생 상태 양호 (특이사항 없음)';

  const renderTableRows = (tabIds: TabId[]) => {
    return tabIds.map(tid => {
      const tabInfo = TAB_INFO[tid];
      if (!tabInfo) return null;

      const sections = CHECKLIST_DATA[tid] || [];
      const allItems = sections.flatMap(s => s.items);
      const itemCount = allItems.length;

      return allItems.map((item: CheckItem, index) => {
        const itemState = state.items[item.id] || {};

        // Custom Tab 5 Temperature check rendering in A4 table
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
              {index === 0 && (
                <td 
                  className="a4-field-cell" 
                  rowSpan={itemCount}
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

        // Custom Tab 4 Filter rendering in A4 table
        if (item.type === 'filter') {
          const p = itemState.pressure !== undefined && itemState.pressure !== null ? `${itemState.pressure.toFixed(1)}bar` : '미선택';
          const bw = itemState.backwash === 2 ? '2회 최종완료' : itemState.backwash === 1 ? '1회 완료' : '미실시';
          const hc = itemState.hairCatcher === 2 ? '2회 완료' : itemState.hairCatcher === 1 ? '1회 완료' : '미실시';
          const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';

          return (
            <tr key={item.id}>
              {index === 0 && (
                <td 
                  className="a4-field-cell" 
                  rowSpan={itemCount}
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

        // Custom Tab 4 Pump rendering in A4 table
        if (item.type === 'pump') {
          const hc = itemState.hairCatcher === 2 ? '2회 완료' : itemState.hairCatcher === 1 ? '1회 완료' : '미실시';
          const isIssue = itemState.sound === 'issue' || itemState.leak === 'issue' || itemState.vibration === 'issue';

          return (
            <tr key={item.id}>
              {index === 0 && (
                <td 
                  className="a4-field-cell" 
                  rowSpan={itemCount}
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

        // Standard item rendering
        return (
          <tr key={item.id}>
            {index === 0 && (
              <td 
                className="a4-field-cell" 
                rowSpan={itemCount}
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
      });
    });
  };

  return (
    <div id="printDocumentHiddenContainer">
      {/* 0페이지 (카톡전송 전용 표지 - 미리보기 썸네일 시 한눈에 파악 가능) */}
      <div className="a4-page-box" id="a4PageCover" style={{
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '50px 40px',
        textAlign: 'center'
      }}>
        <div style={{ width: '100%' }}>
          {/* 로고 & 상호 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <img src="/logo.png" alt="SPA GUARD LOGO" style={{ height: '48px', width: 'auto', borderRadius: '8px', background: '#ffffff', padding: '4px' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1.5px', color: '#60a5fa', fontFamily: 'Cinzel, sans-serif' }}>
                BLUE OCEAN WELLNESS SPA
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '1px' }}>
                목욕장업·스파 시설 통합 안전위생 관리시스템
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)', marginBottom: '35px' }}></div>

          {/* 대형 서식 제목 */}
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            DAILY FACILITY INSPECTION REPORT
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, color: '#ffffff', letterSpacing: '4px', marginBottom: '14px' }}>
            시설관리 점검일지
          </h1>
          <div style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#93c5fd', padding: '5px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '40px' }}>
            📋 카카오톡 단체방 점검 보고서 표지
          </div>

          {/* 한눈에 보이는 요약 정보 카드 (흰색 바탕 대형 글씨) */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px 24px', color: '#0f172a', textAlign: 'left', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', marginBottom: '30px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb', borderBottom: '2px solid #eff6ff', paddingBottom: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📌 점검 요약 정보 (SUMMARY)</span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{state.lastModified} KST</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '15px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>📅 점검 일자</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{state.date}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>👤 점 검 자</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>{state.inspector || '점검자'}</div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>✅ 전체 시설 점검 결과</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>정상 적합 {cntN}건</span>
                  {cntI > 0 ? (
                    <span style={{ color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: '6px', fontSize: '14px' }}>
                      ⚠️ 이상 {cntI}건
                    </span>
                  ) : (
                    <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700 }}>
                      (전 항목 이상무 완료)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 위변조 방지 코드 */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569' }}>
              <span>🔒 <b>보안 인증코드:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{state.securityCode}</span></span>
              <span>블루오션 웰니스 스파</span>
            </div>
          </div>
        </div>

        {/* 표지 하단 안내 */}
        <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
          💡 <b>안내:</b> 본 표지는 카카오톡 요약 확인용이며, 상세 점검 내역은 뒤의 <b>1페이지(앞면)</b> 및 <b>2페이지(뒷면)</b>를 참조해 주세요.
        </div>
      </div>

      {/* 1페이지 (앞면 - 시설 I, II) */}
      <div className="a4-page-box" id="a4Page1">
        <div>
          <div className="a4-header">
            <div className="a4-prefix">
              <span></span>
              <span>페이지: 1 / 2</span>
            </div>
            <h1 className="a4-title">시설관리일지 (앞면)</h1>
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

          <div className="a4-subhead">2. 구역별 점검사항 및 결과 (2층, 지하)</div>
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
              {renderTableRows(['tab1', 'tab2'])}
            </tbody>
          </table>
        </div>

        <div className="a4-page-number">- 1 -</div>
      </div>

      {/* 2페이지 (뒷면 - 시설 III, IV, V) */}
      <div className="a4-page-box" id="a4Page2">
        <div>
          <div className="a4-header">
            <div className="a4-prefix">
              <span></span>
              <span>페이지: 2 / 2</span>
            </div>
            <h1 className="a4-title">시설관리일지 (뒷면)</h1>
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

          <div className="a4-subhead">2. 구역별 점검사항 및 결과 (3층 찜질, 여과/기타, 온도체크)</div>
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
              {renderTableRows(['tab3', 'tab4', 'tab5'])}
            </tbody>
          </table>

          <div className="a4-subhead">3. 종합 의견 및 특이사항</div>
          <div className="a4-footer-box">
            <div style={{ color: '#374151', minHeight: '20px', whiteSpace: 'pre-wrap' }}>
              {overallSummary}
            </div>
            
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280', borderTop: '1px dashed #d1d5db', paddingTop: '4px' }}>
              ⏰ <b>기록일시:</b> <span>{state.lastModified || '-'} (KST)</span>
            </div>
          </div>

          <div className="a4-sign-row" style={{ justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: 'Cinzel, sans-serif', fontWeight: 800, letterSpacing: '1.5px', color: '#1e3a8a', fontSize: '14px' }}>
              BLUE OCEAN WELLNESS SPA
            </div>
          </div>
        </div>

        <div className="a4-page-number">- 2 -</div>
      </div>
    </div>
  );
};
