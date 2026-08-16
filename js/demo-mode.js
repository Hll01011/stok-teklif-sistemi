// Temporary demo mode: authentication is intentionally bypassed while the project is being tested.
// Production auth will be restored later after the database and workflows are stable.
(function () {
  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
  if (!window.sb || !window.sb.auth) return;

  window.sb.auth.getSession = async () => ({
    data: {
      session: {
        user: {
          id: DEMO_USER_ID,
          email: 'demo@his.local'
        }
      }
    },
    error: null
  });

  window.sb.auth.onAuthStateChange = () => ({
    data: { subscription: { unsubscribe() {} } }
  });

  window.sb.auth.signInWithPassword = async () => ({ data: null, error: null });
  window.sb.auth.signOut = async () => ({ error: null });
})();
