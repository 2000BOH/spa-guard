import React from 'react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadJPG: () => void;
  onDownloadPDF: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onDownloadJPG,
  onDownloadPDF,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💾 A4 규격 분할 저장</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--gray-600)', lineHeight: '1.5', marginBottom: '6px' }}>
          스마트폰 갤러리나 인쇄 시 글자가 한눈에 쏙 들어오도록 <b>A4 2페이지(앞/뒷면) 규격</b>으로 나누어 저장합니다.
        </div>
        <div className="modal-btn-grid">
          <button className="modal-choice-btn" onClick={onDownloadJPG}>
            <span>🖼️ A4 이미지 2장 저장 (JPG)</span>
          </button>
          <button className="modal-choice-btn" onClick={onDownloadPDF}>
            <span>📄 A4 2쪽 문서 저장 (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📲 홈 화면 바로가기 추가</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
          • <b>아이폰 (Safari)</b>: 하단 <b>[공유]</b> ➔ <b>[홈 화면에 추가]</b><br />
          • <b>안드로이드 (Chrome)</b>: 우측 상단 <b>[더보기(⋮)]</b> ➔ <b>[홈 화면에 추가]</b>
        </div>
        <button className="modal-footer-btn" onClick={onClose}>확인</button>
      </div>
    </div>
  );
};

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className={`toast ${message ? 'show' : ''}`}>
      {message}
    </div>
  );
};
