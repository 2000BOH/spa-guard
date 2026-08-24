import React, { useState, useRef } from 'react';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResult: (summaryText: string) => void;
}

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  onApplyResult
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setStep('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = () => {
    setStep('analyzing');
    setIsAnalyzing(true);
    // Mock AI Analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult('분석 결과: \n- 특정 장비 이상 감지됨\n- 조치 요망');
      setStep('result');
    }, 2000);
  };

  const handleApply = () => {
    onApplyResult(analysisResult);
    onClose();
    // Reset state after close
    setTimeout(() => {
      setSelectedImage(null);
      setAnalysisResult('');
      setStep('upload');
    }, 300);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSelectedImage(null);
      setAnalysisResult('');
      setStep('upload');
    }, 300);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>AI 사진 분석</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Upload Area */}
          <div 
            onClick={() => step !== 'analyzing' && fileInputRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              cursor: step === 'analyzing' ? 'not-allowed' : 'pointer',
              background: '#f8fafc',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {selectedImage ? (
              <img src={selectedImage} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
            ) : (
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                여기를 눌러 사진을 첨부하세요<br />(갤러리 또는 카메라)
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }} 
            />
          </div>

          {/* Analyzing State */}
          {step === 'analyzing' && (
            <div style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 600, padding: '20px 0' }}>
              <div style={{ marginBottom: '8px', fontSize: '24px' }}>⏳</div>
              AI가 이미지를 분석하고 있습니다...
            </div>
          )}

          {/* Result State */}
          {step === 'result' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>분석 내용 확인 및 수정</label>
              <textarea
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  resize: 'none',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
          {step === 'upload' && (
            <button
              onClick={handleStartAnalysis}
              disabled={!selectedImage}
              style={{
                flex: 1,
                background: selectedImage ? '#3b82f6' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: selectedImage ? 'pointer' : 'not-allowed'
              }}
            >
              분석 시작
            </button>
          )}
          {step === 'result' && (
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              결과 적용하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
