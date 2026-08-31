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
    // 1. 해당 날짜 레코드 존재하는지 확인
    const { data: existing } = await supabase
      .from('inspection_logs')
      .select('id')
      .eq('check_date', state.date)
      .eq('store_name', state.storeName)
      .limit(1);

    const payload = {
      store_name: state.storeName,
      check_date: state.date,
      inspector: state.inspector,
      security_code: state.securityCode,
      recorded_at: state.lastModified,
      items_state: state.items,
      summaries: state.summaries,
      created_at: new Date().toISOString()
    };

    if (existing && existing.length > 0) {
      // 기존 기록이 있으면 데이터 업데이트
      const { data, error } = await supabase
        .from('inspection_logs')
        .update(payload)
        .eq('id', existing[0].id);

      if (error) {
        console.error('Supabase Update Error:', error);
        return { success: false, error };
      }
      return { success: true, data };
    } else {
      // 없으면 새로 삽입
      const { data, error } = await supabase
        .from('inspection_logs')
        .insert([payload]);

      if (error) {
        console.error('Supabase Insert Error:', error);
        return { success: false, error };
      }
      return { success: true, data };
    }
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
      return { success: true, log: data[0] };
    }

    return { success: true, log: null };
  } catch (err) {
    console.error('Supabase Fetch Exception:', err);
    return { success: false, error: err };
  }
}

