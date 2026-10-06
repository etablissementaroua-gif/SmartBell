import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://mnlmilyymnrhkuulcpfw.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubG1pbHl5bW5yaGt1dWxjcGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNTQ4MDEsImV4cCI6MjEwNjczMDgwMX0.xwTWg19h-eLzL7tVpbrPQCiEYYj6jCEhO1Cgk4SzGqk';

export const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('smartbell_supabase_url');
    if (customUrl && customUrl.trim()) return customUrl.trim();
  }
  return import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
};

export const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('smartbell_supabase_anon_key');
    if (customKey && customKey.trim()) return customKey.trim();
  }
  return import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
};

export let supabase: SupabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const reconfigureSupabase = (url: string, key: string): SupabaseClient => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smartbell_supabase_url', url.trim());
    localStorage.setItem('smartbell_supabase_anon_key', key.trim());
  }
  supabase = createClient(url.trim(), key.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  return supabase;
};

export const testSupabaseConnection = async (testUrl?: string, testKey?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const client = (testUrl && testKey) ? createClient(testUrl.trim(), testKey.trim()) : supabase;
    const { error } = await client.from('audio_zones').select('id').limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'تم الاتصال بنجاح بقاعدة بيانات Supabase.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل الاتصال' };
  }
};

export const isSupabaseConfigured = (): boolean => {
  const key = getSupabaseAnonKey();
  return Boolean(key && !key.includes('dummy') && key.length > 50);
};
