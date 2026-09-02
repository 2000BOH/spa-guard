import React from 'react';

interface MetaStripProps {
  checkDate: string;
  inspector: string;
  cntN: number;
  cntI: number;
  cntP: number;
  isReadOnly: boolean;
  onChangeCheckDate: (val: string) => void;
  onChangeInspector?: (val: string) => void;
  inspectorOptions?: string[];
}

export const MetaStrip: React.FC<MetaStripProps> = ({
  checkDate,
  inspector,
  cntN,
  cntI,
  cntP,
  isReadOnly,
  onChangeCheckDate,
  onChangeInspector,
  inspectorOptions = [],
}) => {
  // 중복 제거 및 유효한 점검자 후보 리스트 생성
  const optionsList = Array.from(new Set([...inspectorOptions, inspector].filter(Boolean)));
  if (optionsList.length === 0) optionsList.push('점검자');

  return (
    <div className="meta-strip" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
      <div className="meta-inputs" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <input 
          type="date" 
          value={checkDate} 
          onChange={(e) => onChangeCheckDate(e.target.value)} 
          style={{ height: '34px' }}
        />
        
        {/* 점검자 칩 선택 레이아웃 (사람이 많으면 다음 행으로 나열) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
            👤 점검자:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            {optionsList.map((name) => {
              const isSelected = name === inspector;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onChangeInspector && onChangeInspector(name)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: isSelected ? '#2563eb' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    boxShadow: isSelected ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {isReadOnly && (
          <span style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            🔒 과거 기록 (조회 전용)
          </span>
        )}
      </div>
      
      <div className="meta-counts" style={{ justifyContent: 'flex-end' }}>
        <span className="badge-n">정상 <b>{cntN}</b></span>
        <span className="badge-i">이상 <b>{cntI}</b></span>
        <span className="badge-p">미점검 <b>{cntP}</b></span>
      </div>
    </div>
  );
};
