import React, { useState, useEffect } from 'react';
import type { AdminSettings } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: AdminSettings = {
  defaultTargetTemp: 10.0,
  defaultBackwashCount: 2
};

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsAuth(false);
      setErrorMsg('');
      try {
        const saved = localStorage.getItem('spa_admin_settings');
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuth = () => {
    if (pin === '0000') {
      setIsAuth(true);
      setErrorMsg('');
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      setPin('');
    }
  };

  const handleSave = () => {
    localStorage.setItem('spa_admin_settings', JSON.stringify(settings));
    alert('관리자 설정이 저장되었습니다.');
    onClose();
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ 관리자 설정</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {!isAuth ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              기본 기준값 설정을 위해 관리자 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={pin}
              placeholder="4자리 비밀번호 (0000)"
              maxLength={4}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              style={{
                width: '180px', height: '44px', fontSize: '18px', textAlign: 'center',
                letterSpacing: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px'
              }}
            />
            {errorMsg && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{errorMsg}</div>}
            <button
              onClick={handleAuth}
              style={{
                width: '180px', height: '44px', background: '#1e293b', color: '#fff',
                fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer'
              }}
            >
              확인
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                기본 기준온도 (℃)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.defaultTargetTemp}
                onChange={(e) => setSettings({ ...settings, defaultTargetTemp: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', height: '40px', padding: '0 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>온도 체크 화면에 입력될 기본 기준온도입니다.</p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                기본 여과 횟수 기준
              </label>
              <select
                value={settings.defaultBackwashCount}
                onChange={(e) => setSettings({ ...settings, defaultBackwashCount: parseInt(e.target.value, 10) })}
                style={{ width: '100%', height: '40px', padding: '0 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value={1}>1회</option>
                <option value={2}>2회</option>
                <option value={3}>3회</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              style={{
                width: '100%', height: '48px', background: '#2563eb', color: '#fff',
                fontSize: '15px', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer'
              }}
            >
              설정 저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
