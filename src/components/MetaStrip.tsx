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
  return (
    <div className="meta-strip">
      <div className="meta-inputs">
        <input 
          type="date" 
          value={checkDate} 
          onChange={(e) => onChangeCheckDate(e.target.value)} 
        />
        {inspectorOptions.length > 0 ? (
          <select
            value={inspector}
            disabled={isReadOnly}
            onChange={(e) => onChangeInspector(e.target.value)}
            style={{ width: '120px', height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '13px', color: '#0f172a', background: '#fff' }}
          >
            <option value="" disabled>이름 선택</option>
            {inspectorOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : (
          <input 
            type="text" 
            value={inspector} 
            placeholder="이름" 
            disabled={isReadOnly}
            onChange={(e) => onChangeInspector(e.target.value)} 
          />
        )}
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
