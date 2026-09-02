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
}) => {
  return (
    <div className="meta-strip">
      <div className="meta-inputs">
        <input 
          type="date" 
          value={checkDate} 
          onChange={(e) => onChangeCheckDate(e.target.value)} 
        />
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          <span>👤 점검자:</span>
          <span style={{ color: '#0284c7' }}>{inspector || '미지정'}</span>
        </div>
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
