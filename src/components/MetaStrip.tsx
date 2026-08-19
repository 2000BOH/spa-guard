import React from 'react';

interface MetaStripProps {
  storeName: string;
  checkDate: string;
  inspector: string;
  cntN: number;
  cntI: number;
  cntP: number;
  onChangeStoreName: (val: string) => void;
  onChangeCheckDate: (val: string) => void;
  onChangeInspector: (val: string) => void;
}

export const MetaStrip: React.FC<MetaStripProps> = ({
  storeName,
  checkDate,
  inspector,
  cntN,
  cntI,
  cntP,
  onChangeStoreName,
  onChangeCheckDate,
  onChangeInspector,
}) => {
  return (
    <div className="meta-strip">
      <div className="meta-inputs">
        <input 
          type="text" 
          className="store-input" 
          value={storeName} 
          placeholder="업소명" 
          onChange={(e) => onChangeStoreName(e.target.value)} 
        />
        <input 
          type="date" 
          value={checkDate} 
          onChange={(e) => onChangeCheckDate(e.target.value)} 
        />
        <input 
          type="text" 
          value={inspector} 
          placeholder="이름" 
          onChange={(e) => onChangeInspector(e.target.value)} 
        />
      </div>
      <div className="meta-counts">
        <span className="badge-n">정상 <b>{cntN}</b></span>
        <span className="badge-i">이상 <b>{cntI}</b></span>
        <span className="badge-p">미점검 <b>{cntP}</b></span>
      </div>
    </div>
  );
};
