/* =========================================================
   ADMIN AUTH
   Real mode: Supabase Auth (email/password) + a row in the `admins`
   table (see supabase/schema.sql → "Creating an admin user" in README).
   Demo mode (no Supabase configured): any email/password logs in, so
   the dashboard can be tried before a database exists.
========================================================= */

const ADMIN_SESSION_KEY = 'bk_admin_demo_session';
// Demo login (any email/password) only ever works on your own computer.
// On the public site without Supabase configured, admin is simply closed.
const IS_LOCAL_PREVIEW = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
const ADMIN_AUTH_DEMO_MODE = !IS_LIVE_BACKEND && IS_LOCAL_PREVIEW;
const ADMIN_CLOSED = !IS_LIVE_BACKEND && !IS_LOCAL_PREVIEW;

async function adminLogin(email, password){
  if (ADMIN_CLOSED) return { success: false, error: 'Admin login is not set up on this site yet.' };
  if (!IS_LIVE_BACKEND) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, email || 'demo-admin');
    return { success: true };
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };

  const { data: adminRow, error: adminError } = await client
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await client.auth.signOut();
    return { success: false, error: 'This account is not an admin.' };
  }

  return { success: true };
}

// Returns true only for a signed-in admin; otherwise redirects to login
// and returns false so the caller stops before loading any data.
async function requireAdminAuth(){
  const deny = () => { window.location.replace('login.html'); return false; };
  if (ADMIN_CLOSED) return deny();
  if (!IS_LIVE_BACKEND) return sessionStorage.getItem(ADMIN_SESSION_KEY) ? true : deny();
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  if (!data.session) return deny();

  const { data: adminRow } = await client
    .from('admins')
    .select('user_id')
    .eq('user_id', data.session.user.id)
    .maybeSingle();
  if (!adminRow) return deny();
  return true;
}

async function adminLogout(){
  if (IS_LIVE_BACKEND) {
    const client = getSupabaseClient();
    await client.auth.signOut();
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
  window.location.href = 'login.html';
}
