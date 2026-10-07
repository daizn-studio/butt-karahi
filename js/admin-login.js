/* Admin login page (moved out of admin/login.html so the page's
   Content-Security-Policy can forbid inline scripts). */
document.getElementById('demoModeNotice').hidden = !ADMIN_AUTH_DEMO_MODE;
document.getElementById('closedNotice').hidden = !ADMIN_CLOSED;
if (ADMIN_CLOSED) document.querySelector('#loginForm button[type="submit"]').disabled = true;

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  const result = await adminLogin(email, password);
  if (result.success) window.location.href = 'dashboard.html';
  else errorEl.textContent = result.error || 'Login failed. Check your details and try again.';
});
