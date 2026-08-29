import React, { useState, useEffect, useRef } from 'react';

const SLOTS = ['00:00', '02:30', '05:00'];
const SLOT_NOTE: Record<string, string> = { '00:00': '심야 정지', '02:30': '여과 순환', '05:00': '영업 준비' };
const BLOCKS = ['상단 · 여과기 / 부로와', '중단 · 수위 / 사우나', '하단 · 벤취젯 / 파도풀 / 샤워'];

interface DeviceDef {
  g: number;
  t: string;
  n: string;
  s: string;
  num?: string;
  nc?: string;
}

const DEFS: Record<string, DeviceDef[]> = {
  m: [
    { g: 0, t: 'tang', n: '온탕여과기', s: '(남)', num: '4', nc: '#1046c8' },
    { g: 0, t: 'tang', n: '열탕여과기', s: '(남)', num: '6', nc: '#1046c8' },
    { g: 0, t: 'tang', n: '벤취젯여과기', s: '(남)', num: '9', nc: '#1046c8' },
    { g: 0, t: 'tang', n: '냉탕여과기', s: '(남)', num: '5', nc: '#1046c8' },
    { g: 0, t: 'tang', n: '온탕부로와', s: '(남)' },
    { g: 0, t: 'tang', n: '열탕부로와', s: '(남)' },
    { g: 1, t: 'tang', n: '온탕수위', s: '(남)' },
    { g: 1, t: 'tang', n: '열탕수위', s: '(남)' },
    { g: 1, t: 'tang', n: '벤취젯수위', s: '(남)' },
    { g: 1, t: 'tang', n: '냉탕수위', s: '(남)' },
    { g: 1, t: 'onoff', n: '건식사우나', s: '(남)' },
    { g: 1, t: 'onoff', n: '족탕여과기', s: '(공용실)', num: '3', nc: '#8a8f86' },
    { g: 2, t: 'auto', n: '벤취젯1', s: '(남)' },
    { g: 2, t: 'auto', n: '벤취젯2', s: '(남)' },
    { g: 2, t: 'auto', n: '벤취젯3', s: '(남)' },
    { g: 2, t: 'auto', n: '파도풀', s: '(남)' },
    { g: 2, t: 'auto', n: '넥샤워', s: '(남)' },
    { g: 2, t: 'auto', n: '족탕수위', s: '(공용실)' }
  ],
  f: [
    { g: 0, t: 'tang', n: '온탕여과기', s: '(여)', num: '8', nc: '#c81028' },
    { g: 0, t: 'tang', n: '열탕여과기', s: '(여)', num: '1', nc: '#c81028' },
    { g: 0, t: 'tang', n: '벤취젯여과기', s: '(여)', num: '2', nc: '#c81028' },
    { g: 0, t: 'tang', n: '냉탕여과기', s: '(여)', num: '7', nc: '#c81028' },
    { g: 0, t: 'tang', n: '온탕부로와', s: '(여)' },
    { g: 0, t: 'tang', n: '열탕부로와', s: '(여)' },
    { g: 1, t: 'tang', n: '온탕수위', s: '(여)' },
    { g: 1, t: 'tang', n: '열탕수위', s: '(여)' },
    { g: 1, t: 'tang', n: '벤취젯수위', s: '(여)' },
    { g: 1, t: 'tang', n: '냉탕수위', s: '(여)' },
    { g: 1, t: 'onoff', n: '건식사우나', s: '(여)' },
    { g: 1, t: 'onoff', n: '습식사우나', s: '(여)' },
    { g: 2, t: 'auto', n: '벤취젯1', s: '(여)' },
    { g: 2, t: 'auto', n: '벤취젯2', s: '(여)' },
    { g: 2, t: 'auto', n: '벤취젯3', s: '(여)' },
    { g: 2, t: 'auto', n: '파도풀', s: '(여)' },
    { g: 2, t: 'auto', n: '넥샤워', s: '(여)' },
    { g: 2, t: 'auto', n: '열교환기순환', s: '(공용)' }
  ]
};

const defaultMark = (d: any) => ((d.g === 1 && d.t === 'tang') || (d.g === 2 && d.last)) ? 'r' : null;

const runLabel = (d: any, p: string) => d.t === 'tang' ? (p === 'm' ? '남탕' : '여탕') : d.t === 'onoff' ? 'ON' : '자동';
const positionsFor = (d: any, p: string) => d.t === 'onoff' ? ['OFF', 'ON'] : ['수동', 'OFF', runLabel(d, p)];

const angleFor = (d: any, p: string, pos: string) => {
  const list = positionsFor(d, p);
  const i = list.indexOf(pos);
  if (list.length === 2) return i === 0 ? -45 : 45;
  return [-48, 0, 48][i < 0 ? 1 : i];
};

const defaultSchedule = () => {
  const out: any = {};
  SLOTS.forEach(slot => {
    out[slot] = {};
    ['m', 'f'].forEach(p => {
      const arr = DEFS[p].map((d, i) => ({ ...d, id: p + '-' + i, last: i === DEFS[p].length - 1 }));
      arr.forEach(d => {
        const run = runLabel(d, p);
        let v = 'OFF';
        if (slot === '05:00') v = run;
        else if (slot === '02:30' && (d.g === 0 || (d.g === 1 && d.t === 'tang'))) v = run;
        out[slot][d.id] = v;
      });
    });
  });
  return out;
};

const activeSlot = (now: Date) => {
  const t = now.getHours() * 60 + now.getMinutes();
  if (t >= 300) return '05:00';
  if (t >= 150) return '02:30';
  return '00:00';
};

const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
};

const getDevices = (p: string) => DEFS[p].map((d, i) => ({ ...d, id: p + '-' + i, last: i === DEFS[p].length - 1 }));

interface MachineRoomPanelProps {
  admin?: boolean;
  initialSlot?: string;
}

export default function MachineRoomPanel({ admin = false, initialSlot }: MachineRoomPanelProps) {
  const [slot, setSlot] = useState<string>('00:00');
  const [schedule, setSchedule] = useState<any>(null);
  const [actual, setActual] = useState<any>({});
  const [marks, setMarks] = useState<any>({});
  const [now, setNow] = useState(new Date());

  const dragRef = useRef<{ cx: number, cy: number, from: string, moved: boolean, id: string } | null>(null);
  const draggedFlag = useRef(false);

  useEffect(() => {
    let s = null, a = {}, m = {};
    try {
      s = JSON.parse(localStorage.getItem('spa.panel.schedule.v1') || 'null');
      a = JSON.parse(localStorage.getItem('spa.panel.actual.v1') || '{}') || {};
      m = JSON.parse(localStorage.getItem('spa.panel.mark.v1') || '{}') || {};
    } catch (e) {}
    if (!s) s = defaultSchedule();
    setSchedule(s);
    setActual(a);
    setMarks(m);
    setSlot(initialSlot || activeSlot(new Date()));

    const timer = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialSlot) {
      setSlot(initialSlot);
    }
  }, [initialSlot]);

  const saveSchedule = (s: any) => {
    try {
      const meta = JSON.parse(localStorage.getItem('spa.panel.meta.v1') || 'null');
      if (!meta || meta.date !== todayStr()) {
        localStorage.setItem('spa.panel.prevday.v1', JSON.stringify(schedule || s));
        localStorage.setItem('spa.panel.meta.v1', JSON.stringify({ date: todayStr() }));
      }
    } catch (e) {}
    setSchedule(s);
    try { localStorage.setItem('spa.panel.schedule.v1', JSON.stringify(s)); } catch (e) {}
  };

  const saveActual = (a: any) => {
    setActual(a);
    try { localStorage.setItem('spa.panel.actual.v1', JSON.stringify(a)); } catch (e) {}
  };

  const cycleMark = (d: any) => {
    if (!admin) return;
    const order = ['r', 'y', 'b', 'w', null]; // Added 'w' for white as requested earlier
    const cur = marks[d.id] === undefined ? defaultMark(d) : marks[d.id];
    const next = order[(order.indexOf(cur as any) + 1) % order.length];
    const m = { ...marks, [d.id]: next };
    setMarks(m);
    try { localStorage.setItem('spa.panel.mark.v1', JSON.stringify(m)); } catch (e) {}
  };

  const setPos = (d: any, pos: string) => {
    if (admin) {
      const s = { ...schedule };
      s[slot] = { ...(s[slot] || {}), [d.id]: pos };
      saveSchedule(s);
    } else {
      saveActual({ ...actual, [d.id]: pos });
    }
  };

  const stepPos = (d: any, key: string, dir: number) => {
    const list = positionsFor(d, key);
    const cur = admin ? ((schedule || {})[slot] || {})[d.id] : actual[d.id];
    const i = list.indexOf(cur);
    setPos(d, list[((i < 0 ? 0 : i) + dir + list.length) % list.length]);
  };

  const copyPrevDay = () => {
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem('spa.panel.prevday.v1') || 'null'); } catch (e) {}
    if (!prev) prev = defaultSchedule();
    const s = { ...schedule };
    s[slot] = { ...prev[slot] };
    saveSchedule(s);
  };

  const copyPrevSlot = () => {
    const i = SLOTS.indexOf(slot);
    const prev = SLOTS[(i + SLOTS.length - 1) % SLOTS.length];
    const s = { ...schedule };
    s[slot] = { ...s[prev] };
    saveSchedule(s);
  };

  const bulkSet = (p: string, g: number, mode: string) => {
    const s = { ...schedule };
    const map = { ...s[slot] };
    getDevices(p).filter((d: any) => d.g === g).forEach((d: any) => { map[d.id] = mode === 'run' ? runLabel(d, p) : 'OFF'; });
    s[slot] = map;
    saveSchedule(s);
  };

  const active = activeSlot(now);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  const clockText = pad(now.getHours()) + ':' + pad(now.getMinutes());

  const SLOT_THEME: any = {
    '00:00': { bg: '#0a0b0d', fg: '#ffffff' },
    '02:30': { bg: '#0052ff', fg: '#ffffff' },
    '05:00': { bg: '#eef0f3', fg: '#0a0b0d' }
  };
  const theme = SLOT_THEME[slot] || { bg: '#eef0f3', fg: '#0a0b0d' };

  const bigTabStyle = (on: boolean, s: string): React.CSSProperties => {
    const t = SLOT_THEME[s] || { bg: '#0052ff', fg: '#ffffff' };
    return {
      padding: '8px 6px', minHeight: '62px', borderRadius: '12px',
      border: on ? '2px solid ' + (t.bg === '#eef0f3' ? '#0a0b0d' : t.bg) : '1px solid rgba(91,97,110,0.2)',
      background: on ? t.bg : '#ffffff', color: on ? t.fg : '#5b616e',
      transition: 'all 200ms ease-in-out',
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      outline: 'none'
    };
  };

  const buildPanel = (key: string, title: string) => {
    const sched = (schedule || {})[slot] || {};
    const all = getDevices(key);
    const done = all.filter((d: any) => (actual[d.id] || '') === (sched[d.id] || 'OFF')).length;
    const complete = done === all.length;

    return {
      title,
      key,
      chipText: admin ? '지시 편집 중' : done + ' / ' + all.length + ' 완료',
      chipStyle: {
        padding: '6px 12px', borderRadius: '100000px', fontSize: '12px', fontWeight: 700,
        background: admin ? '#eef0f3' : (complete ? '#0a0b0d' : '#0052ff'),
        color: admin ? '#5b616e' : '#ffffff'
      },
      blocks: BLOCKS.map((bt, gi) => ({
        title: bt,
        bulk: admin ? [
          { label: '전체 운전', onClick: () => bulkSet(key, gi, 'run'), style: { padding: '6px 10px', minHeight: '32px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.35)', background: '#ffffff', color: '#0052ff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } },
          { label: '전체 OFF', onClick: () => bulkSet(key, gi, 'off'), style: { padding: '6px 10px', minHeight: '32px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.35)', background: '#ffffff', color: '#0a0b0d', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }
        ] : [],
        cells: all.filter((d: any) => d.g === gi).map((d: any) => {
          const target = sched[d.id] || 'OFF';
          const ok = true; // Wait! For the view it should just show the target!
          const shown = target; // As requested: Only show what admin set.
          const need = false; // Never need to change in this view
          const angle = angleFor(d, key, shown || 'OFF');
          const mark = marks[d.id] === undefined ? defaultMark(d) : marks[d.id];
          const markColor: any = { r: '#d1242f', y: '#e0a800', b: '#0052ff', w: '#ffffff' }[mark as string] || null;
          const manual = shown === '수동';
          
          return {
            d,
            name: d.n,
            sub: d.s,
            onMark: () => cycleMark(d),
            knobBaseStyle: {
              position: 'relative' as const, width: '58px', height: '58px', borderRadius: '50%',
              background: '#b7bcb2', border: '2px solid #9aa094', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'grab',
              touchAction: 'none', userSelect: 'none' as const
            },
            onKnobTap: () => { if (!draggedFlag.current) stepPos(d, key, 1); draggedFlag.current = false; },
            onKnobDown: (e: React.PointerEvent<HTMLDivElement>) => {
              const r = e.currentTarget.getBoundingClientRect();
              dragRef.current = { id: d.id, cx: r.left + r.width / 2, cy: r.top + r.height / 2, from: shown || 'OFF', moved: false };
              draggedFlag.current = false;
              if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
            },
            onKnobMove: (e: React.PointerEvent<HTMLDivElement>) => {
              const g = dragRef.current;
              if (!g || g.id !== d.id) return;
              const dx = e.clientX - g.cx, dy = e.clientY - g.cy;
              if (Math.sqrt(dx * dx + dy * dy) < 12) return;
              g.moved = true; draggedFlag.current = true;
              const deg = Math.atan2(dx, -dy) * 180 / Math.PI;
              const list = positionsFor(d, key);
              let best = list[0], bd = 999;
              list.forEach(p => { const diff = Math.abs(angleFor(d, key, p) - deg); if (diff < bd) { bd = diff; best = p; } });
              if (best !== (admin ? target : actual[d.id])) setPos(d, best);
            },
            onKnobUp: () => { dragRef.current = null; setTimeout(() => { draggedFlag.current = false; }, 120); },
            cellStyle: {
              padding: '6px 4px 8px', borderRadius: '12px',
              border: markColor ? '4px solid ' + markColor : (need ? '2px dashed #0052ff' : '2px solid transparent'),
              background: manual ? 'rgba(20,25,21,0.13)' : (markColor ? 'rgba(255,255,255,0.28)' : (need ? 'rgba(0,82,255,0.10)' : 'transparent')),
              transition: 'all 200ms ease-in-out',
              pointerEvents: admin ? 'auto' as const : 'none' as const
            },
            plateStyle: {
              background: '#f3f4f0', border: '1px solid rgba(20,25,21,0.18)',
              borderRadius: '5px', padding: '4px 3px', textAlign: 'center' as const, minHeight: '34px',
              cursor: 'pointer', transition: 'all 200ms ease-in-out'
            },
            posPlateStyle: {
              display: 'grid', gridTemplateColumns: 'repeat(' + positionsFor(d, key).length + ',1fr)',
              gap: '2px', background: '#f3f4f0', border: '1px solid rgba(20,25,21,0.18)',
              borderRadius: '5px 5px 0 0', borderBottom: 'none', padding: '3px 3px 10px', marginTop: '6px'
            },
            positions: positionsFor(d, key).map(pos => {
              const isTarget = pos === target, isCur = shown === pos;
              const kind = pos === '수동' ? 'manual' : pos === 'OFF' ? 'off' : 'run';
              const c = kind === 'manual' ? '#7d8279' : kind === 'off' ? '#15181a' : '#0052ff';
              let bg = 'transparent', color = c, border = '1px solid transparent';
              if (isCur) { bg = '#ffffff'; color = c; border = '2.5px solid ' + c; }
              if ((admin || !ok) && isTarget) { bg = c; color = '#ffffff'; border = '2.5px solid ' + c; }
              return {
                label: pos, onClick: () => setPos(d, pos),
                style: {
                  minHeight: '30px', padding: '4px 1px', borderRadius: '4px', border: border,
                  background: bg, color: color, fontSize: '10.5px', fontWeight: 700,
                  transition: 'all 200ms ease-in-out', cursor: 'pointer', outline: 'none'
                }
              };
            }),
            knobStyle: {
              width: '44px', height: '44px', borderRadius: '50%',
              background: shown === null ? '#6f7570' : '#23272a',
              border: '2px solid #cfd3cb', position: 'relative' as const, opacity: shown === null ? 0.55 : 1,
              transform: 'rotate(' + angle + 'deg)', transition: 'transform 260ms ease-in-out'
            },
            lineStyle: {
              position: 'absolute' as const, left: '50%', top: '5px', width: '3px', height: '18px',
              marginLeft: '-1.5px', borderRadius: '2px',
              background: shown === null ? '#e9ebe6' : (shown === '수동' ? '#d1242f' : (shown === 'OFF' ? '#ffffff' : '#4d8cff'))
            },
            footText: manual ? '⚠️ 주의' : '',
            footStyle: {
              marginTop: '18px', textAlign: 'center' as const, fontSize: '10.5px', fontWeight: 700,
              color: '#ef4444'
            }
          };
        })
      }))
    };
  };

  const panels = [buildPanel('m', '왼쪽 패널 (남탕 + 족탕)'), buildPanel('f', '오른쪽 패널 (여탕 + 열교환)')];
  const allIds = [].concat(getDevices('m') as any, getDevices('f') as any).map((d: any) => d.id);

  const tools = [
    { label: '전 타임과 설정 동일', onClick: () => copyPrevSlot(), style: { padding: '11px 16px', minHeight: '44px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.2)', background: '#eef0f3', color: '#0a0b0d', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } },
    { label: '전일과 설정 동일', onClick: () => copyPrevDay(), style: { padding: '11px 16px', minHeight: '44px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.2)', background: '#eef0f3', color: '#0a0b0d', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } },
    { label: '진행 초기화', onClick: () => { const a = { ...actual }; allIds.forEach(id => delete a[id]); saveActual(a); }, style: { padding: '11px 16px', minHeight: '44px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.2)', background: '#ffffff', color: '#0a0b0d', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } },
    { label: '지시값 기본으로 되돌리기', onClick: () => saveSchedule(defaultSchedule()), style: { padding: '11px 16px', minHeight: '44px', borderRadius: '100000px', border: '1px solid rgba(91,97,110,0.2)', background: '#ffffff', color: '#5b616e', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }
  ];

  if (!schedule) return null;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Noto Sans KR', sans-serif", color: '#0a0b0d', background: '#ffffff', padding: '20px 16px 48px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 🖨️ 프린터 전용 헤더 */}
      <div className="print-only" style={{ display: 'none', borderBottom: '2px solid #0a0b0d', paddingBottom: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b616e', marginBottom: '4px' }}>스파 기계실 · MAIN CONTROL PANEL</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0a0b0d' }}>{admin ? '기계실 점검 지시서' : '기계실 점검 현황'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, lineHeight: 1, color: '#0052ff' }}>{slot}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#5b616e', marginTop: '4px' }}>{SLOT_NOTE[slot]}</div>
          </div>
        </div>
      </div>

      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: '#5b616e', marginBottom: '6px' }}>스파 기계실 · MAIN CONTROL PANEL</div>
          <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.15 }}>메인 기계실</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '26px', fontWeight: 700 }}>{clockText}</div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#5b616e' }}>현재 적용 시간대 {active}</div>
        </div>
      </div>

      <div className="print-hide" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {SLOTS.map(s => (
          <button key={s} onClick={() => setSlot(s)} style={bigTabStyle(s === slot, s)}>
            <span style={{ display: 'block', fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontSize: '30px', fontWeight: 700, lineHeight: 1 }}>{s}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginTop: '4px', opacity: 0.8 }}>{SLOT_NOTE[s]}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'none', borderRadius: '20px', padding: '20px 22px', marginBottom: '18px', border: theme.bg === '#eef0f3' ? '1px solid rgba(91,97,110,0.2)' : '1px solid transparent', background: theme.bg, color: theme.fg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontSize: '52px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{slot}</div>
          <div style={{ padding: '8px 14px', borderRadius: '100000px', fontSize: '13px', fontWeight: 700, background: theme.bg === '#eef0f3' ? '#0a0b0d' : 'rgba(255,255,255,0.16)', color: theme.bg === '#eef0f3' ? '#ffffff' : '#ffffff' }}>
            {SLOT_NOTE[slot] || ''}{slot === active ? ' · 지금 시간대' : ''}
          </div>
        </div>
      </div>

      <div className="machine-room-print-panels" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '18px' }}>
        {panels.map((pn) => (
          <div key={pn.key} style={{ border: '1px solid rgba(91,97,110,0.2)', borderRadius: '20px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 16px', background: '#ffffff', borderBottom: '1px solid rgba(91,97,110,0.2)' }}>
              <div style={{ fontSize: '17px', fontWeight: 700 }}>{pn.title}</div>
              <div style={pn.chipStyle}>{pn.chipText}</div>
            </div>

            <div style={{ overflowX: 'auto', background: '#c9cec2', padding: '16px 14px 20px' }}>
              <div style={{ minWidth: '492px' }}>
                {pn.blocks.map((b, bi) => (
                  <div key={bi} style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#3d4239', letterSpacing: '0.02em' }}>{b.title}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {b.bulk.map((k, ki) => (
                          <button key={ki} onClick={k.onClick} style={k.style}>{k.label}</button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', alignItems: 'start' }}>
                      {b.cells.map((d) => (
                        <div key={d.d.id} style={d.cellStyle}>
                          <div onClick={d.onMark} style={d.plateStyle}>
                            <div style={{ fontSize: '10.5px', fontWeight: 700, lineHeight: 1.2, color: '#141915' }}>{d.name}</div>
                            <div style={{ fontSize: '9.5px', fontWeight: 600, lineHeight: 1.2, color: '#4a4f47' }}>{d.sub}</div>
                          </div>
                          
                          <div style={d.posPlateStyle}>
                            {d.positions.map((p, pi) => (
                              <button key={pi} onClick={p.onClick} style={p.style}>{p.label}</button>
                            ))}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-2px' }}>
                            <div 
                              onClick={d.onKnobTap} 
                              onPointerDown={d.onKnobDown} 
                              onPointerMove={d.onKnobMove} 
                              onPointerUp={d.onKnobUp} 
                              style={d.knobBaseStyle}
                            >
                              <div style={d.knobStyle}>
                                <div style={d.lineStyle}></div>
                                <div style={{ position: 'absolute', left: '50%', bottom: '-16px', width: '9px', height: '26px', marginLeft: '-4.5px', background: '#15181a', borderRadius: '0 0 5px 5px' }}></div>
                              </div>
                            </div>
                          </div>
                          
                          <div style={d.footStyle}>{d.footText}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {admin && (
        <div className="print-hide" style={{ borderTop: '1px solid rgba(91,97,110,0.2)', marginTop: '22px', paddingTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {tools.map((t, i) => (
            <button key={i} onClick={t.onClick} style={t.style}>{t.label}</button>
          ))}
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#5b616e' }}>설정과 진행 상황은 이 기기에 저장됩니다.</span>
        </div>
      )}
    </div>
  );
}
