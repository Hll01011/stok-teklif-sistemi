// HIS PASSWORDLESS MODE
// The application is intentionally passwordless. There is no login, signup or reset flow.
// A fixed internal owner id is used only to keep the existing database ownership columns
// working while the application is operated as a single-company system.
(function () {
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
  const SYSTEM_USER = {
    id: SYSTEM_USER_ID,
    email: 'sistem@his.local'
  };

  window.HIS_SYSTEM_USER = SYSTEM_USER;

  if (!window.sb || !window.sb.auth) return;

  // Keep Supabase's auth client available for database/API compatibility,
  // but never require credentials from the user.
  window.sb.auth.getSession = async () => ({
    data: { session: { user: SYSTEM_USER } },
    error: null
  });

  window.sb.auth.getUser = async () => ({
    data: { user: SYSTEM_USER },
    error: null
  });

  window.sb.auth.onAuthStateChange = (callback) => {
    if (typeof callback === 'function') {
      setTimeout(() => callback('SIGNED_IN', { user: SYSTEM_USER }), 0);
    }
    return { data: { subscription: { unsubscribe() {} } } };
  };

  window.sb.auth.signInWithPassword = async () => ({
    data: { user: SYSTEM_USER, session: { user: SYSTEM_USER } },
    error: null
  });

  window.sb.auth.signOut = async () => ({ error: null });
})();
