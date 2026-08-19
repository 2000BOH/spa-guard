import React from 'react';
import type { AppState, TabId } from '../types';
import { CHECKLIST_DATA, TAB_INFO } from '../data/checklistData';

interface A4PrintDocumentProps {
  state: AppState;
}

export const A4PrintDocument: React.FC<A4PrintDocumentProps> = ({ state }) => {
  const checkDateDot = state.date.replace(/-/g, '.');

  let summaryArr: string[] = [];
  (['tab1', 'tab2', 'tab3', 'tab4'] as TabId[]).forEach(tid => {
    const txt = state.summaries[tid];
    if (txt) summaryArr.push(`• [${TAB_INFO[tid].name}] ${txt}`);
  });

  const overallSummary = summaryArr.length > 0 
    ? summaryArr.join('\n') 
    : '• 전 구역 설비 및 위생 상태 양호 (특이사항 없음)';

  const renderTableRows = (tabIds: TabId[]) => {
    return tabIds.map(tid => {
      const tabInfo = TAB_INFO[tid];
      const sections = CHECKLIST_DATA[tid] || [];
      const allItems = sections.flatMap(s => s.items);
      const itemCount = allItems.length;

      return allItems.map((item, index) => {
        const itemState = state.items[item.id] || { status: null, note: '' };

        return (
          <tr key={item.id}>
            {index === 0 && (
              <td 
                className="a4-field-cell" 
                rowSpan={itemCount}
                dangerouslySetInnerHTML={{ __html: tabInfo.htmlName.replace('\n', '<br>') }}
              />
            )}
            <td className="a4-item-title">• {item.text}</td>
            <td className="center">
              {itemState.status === 'normal' && <span className="a4-res-ok">이상무 (O)</span>}
              {itemState.status === 'issue' && <span className="a4-res-issue">이상 (X)</span>}
              {itemState.status === null && <span className="a4-res-pending">미점검</span>}
            </td>
            <td>
              {itemState.status === 'issue' && itemState.note && (
                <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>{itemState.note}</span>
              )}
              {itemState.status === 'normal' && (
                <span style={{ color: '#059669', fontSize: '11px' }}>적합</span>
              )}
              {itemState.status === null && (
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>-</span>
              )}
            </td>
          </tr>
        );
      });
    });
  };

  return (
    <div id="printDocumentHiddenContainer">
      {/* 1페이지 (앞면 - 시설 I, II) */}
      <div className="a4-page-box" id="a4Page1">
        <div>
          <div className="a4-header">
            <div className="a4-prefix">
              <span>〔공식 서식 앞면〕</span>
              <span>페이지: 1 / 2</span>
            </div>
            <h1 className="a4-title">목욕장업 영업주 자율점검표 (앞면)</h1>
          </div>

          <div className="a4-subhead">1. 업 소 현 황</div>
          <table className="a4-table">
            <tbody>
              <tr>
                <th style={{ width: '15%' }}>업 소 명</th>
                <td style={{ width: '35%' }}>블루오션 웰니스 스파</td>
                <th style={{ width: '20%' }}>신 고 번 호</th>
                <td style={{ width: '30%' }}>제 2026-0815 호</td>
              </tr>
              <tr>
                <th>점검일시</th>
                <td>{checkDateDot}</td>
                <th>점 검 자</th>
                <td>{state.inspector || '점검자'}</td>
              </tr>
            </tbody>
          </table>

          <div className="a4-subhead">2. 시설별 점검사항 및 결과 (시설 Ⅰ, Ⅱ)</div>
          <table className="a4-table">
            <thead>
              <tr>
                <th style={{ width: '17%' }}>점검분야</th>
                <th style={{ width: '51%' }}>점 검 항 목</th>
                <th style={{ width: '14%' }}>점검결과</th>
                <th style={{ width: '18%' }}>비고 및 조치</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows(['tab1', 'tab2'])}
            </tbody>
          </table>
        </div>

        <div className="a4-page-number">- 1 -</div>
      </div>

      {/* 2페이지 (뒷면 - 시설 III, IV) */}
      <div className="a4-page-box" id="a4Page2">
        <div>
          <div className="a4-header">
            <div className="a4-prefix">
              <span>〔공식 서식 뒷면〕</span>
              <span>페이지: 2 / 2</span>
            </div>
            <h1 className="a4-title">목욕장업 영업주 자율점검표 (뒷면)</h1>
          </div>

          <div className="a4-subhead">2. 시설별 점검사항 및 결과 (시설 Ⅲ, Ⅳ)</div>
          <table className="a4-table">
            <thead>
              <tr>
                <th style={{ width: '17%' }}>점검분야</th>
                <th style={{ width: '51%' }}>점 검 항 목</th>
                <th style={{ width: '14%' }}>점검결과</th>
                <th style={{ width: '18%' }}>비고 및 조치</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows(['tab3', 'tab4'])}
            </tbody>
          </table>

          <div className="a4-subhead">3. 종합 의견 및 특이사항</div>
          <div className="a4-footer-box">
            <div style={{ color: '#374151', minHeight: '20px', whiteSpace: 'pre-wrap' }}>
              {overallSummary}
            </div>
            
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#6b7280', borderTop: '1px dashed #d1d5db', paddingTop: '4px' }}>
              🔒 <b>위변조 방지 인증코드:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{state.securityCode}</span>
              &nbsp;|&nbsp; ⏰ <b>기록일시:</b> <span>{state.lastModified || '-'} (KST)</span>
            </div>
          </div>

          <div className="a4-sign-row">
            <div>위와 같이 목욕장업 시설 일일 안전점검을 성실히 실시하였음을 확인합니다.</div>
            <div>점검자: <span style={{ textDecoration: 'underline' }}>{state.inspector || '점검자'}</span> (서명/인)</div>
          </div>
        </div>

        <div className="a4-page-number">- 2 -</div>
      </div>
    </div>
  );
};
