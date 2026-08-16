const SUPABASE_URL = 'https://mshiwsqjscvtmzordxpb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8XOxIx_2pAILlGPBV-xT5Q_yvQzMSp_';

window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
