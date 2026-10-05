class SupabaseConfig {
  static const String supabaseUrl = "https://mnlmilyymnrhkuulcpfw.supabase.co";
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_mobile',
  );
}
