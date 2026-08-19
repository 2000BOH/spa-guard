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
    const { data, error } = await supabase
      .from('inspection_logs')
      .insert([
        {
          store_name: state.storeName,
          check_date: state.date,
          inspector: state.inspector,
          security_code: state.securityCode,
          recorded_at: state.lastModified,
          items_state: state.items,
          summaries: state.summaries,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Supabase Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Supabase Exception:', err);
    return { success: false, error: err };
  }
}
