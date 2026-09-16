import React, { useState, useEffect, useRef } from 'react';
import type { DepartmentId, AdminSettings } from '../types';
import { HandoverModal } from './HandoverModal';
import { ChecklistEditorPage } from './ChecklistEditorPage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_DEPT_CONFIGS,
  loadAdminSettings,
  saveAdminSettings
} from '../lib/adminSettings';
import { saveAdminSettingsToSupabase } from '../lib/supabase';

interface DeptAdminPageProps {
  dept: DepartmentId;
}

const DEPT_INFO: Record<DepartmentId, { name: string; icon: string; color: string }> = {
  facilities: { name: '시설', icon: '🛠️', color: '#0ea5e9' },
  reception:  { name: '리셉션', icon: '🛎️', color: '#8b5cf6' },
  cleaning:   { name: '미화', icon: '🧹', color: '#10b981' },
  food:       { name: '푸드', icon: '🍽️', color: '#f59e0b' },
  snack:      { name: '스낵', icon: '☕', color: '#ef4444' },
};

type PageView = 'menu' | 'handover' | 'editor' | 'inspector';

export const DeptAdminPage: React.FC<DeptAdminPageProps> = ({ dept }) => {
  const [view, setView] = useState<PageView>('menu');
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [inspectorList, setInspectorList] = useState<string[]>(['']);
  const [savedMsg, setSavedMsg] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRef = useRef(true);

  const info = DEPT_INFO[dept];

  useEffect(() => {
    const loaded = loadAdminSettings();
    setSettings(loaded);
    const pool = loaded.deptConfigs[dept]?.inspectorPool || [];
    setInspectorList(pool.length > 0 ? pool : ['']);
    setTimeout(() => { skipRef.current = false; }, 300);
  }, [dept]);

  useEffect(() => {
    if (skipRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveInspectors();
    }, 1000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectorList]);

  const handleSaveInspectors = () => {
    const validNames = inspectorList.map((n: string) => n.trim()).filter(Boolean);
    const newSettings = JSON.parse(JSON.stringify(settings)) as AdminSettings;
    const deptConf = newSettings.deptConfigs[dept] || JSON.parse(JSON.stringify(DEFAULT_DEPT_CONFIGS[dept]));
    deptConf.inspectorPool = validNames;
    deptConf.groups?.forEach((grp: any) => {
      grp.roles?.forEach((r: any) => { r.names = validNames; });
    });
    newSettings.deptConfigs[dept] = deptConf;
    saveAdminSettings(newSettings);
    saveAdminSettingsToSupabase(newSettings);
    setSettings(newSettings);
    setSavedMsg('✅ 저장됨');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const addInspector = () => setInspectorList((prev: string[]) => [...prev, '']);
  const removeInspector = (idx: number) => setInspectorList((prev: string[]) => prev.filter((_: string, i: number) => i !== idx));
  const changeInspector = (idx: number, val: string) =>
    setInspectorList((prev: string[]) => prev.map((v: string, i: number) => i === idx ? val : v));

  if (view === 'handover') {
    return <HandoverModal onClose={() => setView('menu')} adminSettings={settings} />;
  }

  if (view === 'editor') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10000, overflowY: 'auto', background: '#f8fafc' }}>
        <div style={{ padding: '10px 16px', background: info.color, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setView('menu')}
            style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            ← 관리자 메뉴
          </button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{info.icon} {info.name} 체크리스트 편집</span>
        </div>
        <ChecklistEditorPage dept={dept} isDirectAccess={false} onBackToAdmin={() => setView('menu')} />
      </div>
    );
  }

  if (view === 'inspector') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: info.color, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setView('menu')}
            style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            ← 뒤로
          </button>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800 }}>
            {info.icon} {info.name} 파트 담당자 설정
          </h2>
        </div>
        <div style={{ padding: '20px', maxWidth: '500px', width: '100%', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            {info.name} 파트 점검자 이름을 입력하세요.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {inspectorList.map((name: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={name}
                  onChange={e => changeInspector(idx, e.target.value)}
                  placeholder={`${info.name} 담당자 이름`}
                  style={{ flex: 1, height: '40px', padding: '0 12px', fontSize: '14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                />
                {inspectorList.length > 1 && (
                  <button
                    onClick={() => removeInspector(idx)}
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0 10px', height: '40px', fontSize: '16px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addInspector}
            style={{ width: '100%', height: '40px', background: '#f1f5f9', color: '#334155', border: '1.5px dashed #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
          >
            + 담당자 추가
          </button>
          <button
            onClick={handleSaveInspectors}
            style={{ width: '100%', height: '46px', background: info.color, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
          >
            {savedMsg || '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '52px', marginBottom: '8px' }}>{info.icon}</div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{info.name} 파트 관리자</h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>Blue Ocean Wellness Spa</p>
      </div>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <button
          onClick={() => setView('handover')}
          style={{ width: '100%', padding: '20px', border: 'none', borderRadius: '16px', background: '#7c3aed', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', textAlign: 'left' }}
        >
          <span style={{ fontSize: '28px' }}>📝</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '2px' }}>인수인계 작성 / 조회</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>인수인계 및 관리자 지시사항 관리</div>
          </div>
        </button>
        <button
          onClick={() => setView('editor')}
          style={{ width: '100%', padding: '20px', border: 'none', borderRadius: '16px', background: info.color, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: `0 4px 14px ${info.color}50`, textAlign: 'left' }}
        >
          <span style={{ fontSize: '28px' }}>📋</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '2px' }}>{info.name} 체크리스트 목록 편집</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>점검 항목 추가 · 삭제 · 순서 변경</div>
          </div>
        </button>
        <button
          onClick={() => setView('inspector')}
          style={{ width: '100%', padding: '20px', border: 'none', borderRadius: '16px', background: '#0f172a', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 14px rgba(15,23,42,0.25)', textAlign: 'left' }}
        >
          <span style={{ fontSize: '28px' }}>👤</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '2px' }}>{info.name} 파트 담당자 설정</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>점검자 이름 등록 및 수정</div>
          </div>
        </button>
      </div>
      <p style={{ marginTop: '32px', fontSize: '11px', color: '#94a3b8' }}>bowspa.kr</p>
    </div>
  );
};
