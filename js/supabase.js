const SUPABASE_URL = 'https://bfwidcfvihwfnubhovdd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RfFpGHf6u196xmACJ7iLjg_aKskEcye';

// HIS tek firma / şifresiz çalışma modu.
// Kullanıcı girişi yoktur; uygulama doğrudan yalnızca stok ve teklif tablolarına bağlanır.
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
