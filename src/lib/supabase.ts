import { createClient } from '@supabase/supabase-js';
import type { AppState } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export async function saveInspectionToSupabase(state: AppState) {
  if (!supabase) {
    console.log('Supabase client not configured. Skipping remote DB save.');
    return { success: false, reason: 'unconfigured' };
  }

  try {
    // UPDATE RLS 정책 없이도 동작하도록 항상 INSERT
    // (fetchInspection은 recorded_at 최신순으로 가져오므로 최신 레코드가 자동 사용됨)
    // recorded_at을 저장 시점의 ISO 시간으로 항상 갱신하여 최신 데이터임을 보장
    // state.lastModified는 로컬 기록 시간이므로 서버 저장 시간과 다를 수 있음
    const savedAt = new Date().toISOString();
    const payload = {
      store_name: state.storeName,
      check_date: state.date,
      inspector: state.inspector,
      security_code: state.securityCode,
      recorded_at: savedAt,
      items_state: { ...state.items, __handovers__: state.handovers || {} },
      summaries: state.summaries,
      created_at: savedAt
    };

    // UPSERT: check_date + inspector + store_name 조합으로 충돌 시 업데이트
    // 이렇게 해야 레코드가 무한히 쌓이지 않고 같은 날짜/점검자 데이터가 올바르게 갱신됨
    const { data, error } = await supabase
      .from('inspection_logs')
      .upsert([payload], { onConflict: 'check_date,store_name' });

    if (error) {
      console.error('Supabase Upsert Error:', error);
      // upsert 실패 시 insert로 fallback
      const fallback = await supabase.from('inspection_logs').insert([payload]);
      if (fallback.error) {
        console.error('Supabase Insert Fallback Error:', fallback.error);
        return { success: false, error: fallback.error };
      }
      return { success: true, data: fallback.data };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Supabase Exception:', err);
    return { success: false, error: err };
  }
}

export async function fetchInspectionFromSupabase(checkDate: string) {
  if (!supabase) {
    return { success: false, reason: 'unconfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('inspection_logs')
      .select('*')
      .eq('check_date', checkDate)
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase Fetch Error:', error);
      return { success: false, error };
    }

    if (data && data.length > 0) {
      const log = data[0];
      if (log.items_state && log.items_state.__handovers__) {
        log.handovers = log.items_state.__handovers__;
        delete log.items_state.__handovers__;
      }
      return { success: true, log };
    }

    return { success: true, log: null };
  } catch (err) {
    console.error('Supabase Fetch Exception:', err);
    return { success: false, error: err };
  }
}

export async function fetchFutureInspectionsFromSupabase(startDate: string, storeName: string) {
  if (!supabase) return { success: false, reason: 'unconfigured' };
  try {
    const { data, error } = await supabase
      .from('inspection_logs')
      .select('*')
      .eq('store_name', storeName)
      .gte('check_date', startDate)
      .order('check_date', { ascending: true })
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Future Error:', error);
      return { success: false, error };
    }

    // data may contain multiple rows for the same check_date (since we sort by recorded_at descending)
    // we should only return the latest one for each date.
    const latestPerDate = new Map<string, any>();
    if (data) {
      for (const row of data) {
        if (!latestPerDate.has(row.check_date)) {
          if (row.items_state && row.items_state.__handovers__) {
            row.handovers = row.items_state.__handovers__;
            delete row.items_state.__handovers__;
          }
          latestPerDate.set(row.check_date, row);
        }
      }
    }
    
    return { success: true, logs: Array.from(latestPerDate.values()) };
  } catch (err) {
    console.error('Supabase Fetch Future Exception:', err);
    return { success: false, error: err };
  }
}

export async function saveAdminSettingsToSupabase(settings: unknown) {
  if (!supabase) return { success: false, reason: 'unconfigured' };
  try {
    // UPDATE RLS 정책 없이도 동작하도록 항상 INSERT
    // (fetchAdminSettings는 recorded_at 최신순으로 가져오므로 최신 레코드가 자동 사용됨)
    const payload = {
      store_name: 'ADMIN_SETTINGS_STORE',
      check_date: '1970-01-01',
      inspector: 'ADMIN',
      security_code: 'ADMIN_SETTINGS',
      recorded_at: new Date().toISOString(),
      items_state: settings as Record<string, unknown>,
      summaries: {},
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('inspection_logs')
      .insert([payload]);
    if (error) return { success: false, error };
    return { success: true, data };
  } catch (err) {
    console.error('saveAdminSettingsToSupabase exception:', err);
    return { success: false, error: err };
  }
}

export async function fetchAdminSettingsFromSupabase() {
  if (!supabase) return { success: false, reason: 'unconfigured' };
  try {
    const { data, error } = await supabase
      .from('inspection_logs')
      .select('*')
      .eq('store_name', 'ADMIN_SETTINGS_STORE')
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (error) return { success: false, error };
    if (data && data.length > 0 && data[0].items_state) {
      return { success: true, settings: data[0].items_state };
    }
    return { success: true, settings: null };
  } catch (err) {
    console.error('fetchAdminSettingsFromSupabase exception:', err);
    return { success: false, error: err };
  }
}

