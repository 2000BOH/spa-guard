import React from 'react';

interface MetaStripProps {
  checkDate: string;
  inspector: string;
  cntN: number;
  cntI: number;
  cntP: number;
  isReadOnly: boolean;
  onChangeCheckDate: (val: string) => void;
  onChangeInspector: (val: string) => void;
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
}) => {
  return (
    <div className="meta-strip">
      <div className="meta-inputs">
        <input 
          type="date" 
          value={checkDate} 
          onChange={(e) => onChangeCheckDate(e.target.value)} 
        />
        <input 
          type="text" 
          value={inspector} 
          placeholder="이름" 
          disabled={isReadOnly}
          onChange={(e) => onChangeInspector(e.target.value)} 
        />
        {isReadOnly && (
          <span style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            🔒 과거 기록 (조회 전용)
          </span>
        )}
      </div>
      <div className="meta-counts">
        <span className="badge-n">정상 <b>{cntN}</b></span>
        <span className="badge-i">이상 <b>{cntI}</b></span>
        <span className="badge-p">미점검 <b>{cntP}</b></span>
      </div>
    </div>
  );
};
