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

    const { data, error } = await supabase
      .from('inspection_logs')
      .insert([payload]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      return { success: false, error };
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
      return { success: true, log: data[0] };
    }

    return { success: true, log: null };
  } catch (err) {
    console.error('Supabase Fetch Exception:', err);
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

