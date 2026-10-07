/* =========================================================
   ADMIN DASHBOARD
   Menu CRUD + order management. Talks to Supabase when configured;
   otherwise reads/writes localStorage so the dashboard is fully
   clickable before a database exists.

   Demo-mode orders come from the same 'bk_demo_orders' key that
   js/app.js writes to on checkout, so a demo order placed on the
   storefront shows up here. Demo-mode menu edits live in their own
   'bk_admin_demo_menu' key (seeded from js/menu-data.js) — they do
   not feed back into the storefront's demo menu, since that's a
   static fallback file; connect Supabase to make edits here go live.
========================================================= */

const DEMO_MENU_STORE_KEY = 'bk_admin_demo_menu';
const DEMO_MENU_VERSION_KEY = 'bk_admin_demo_menu_version';
let dashboardMenuItems = [];
let dashboardOrders = [];
let editingItemId = null;

/* ---------------- demo-mode storage helpers ---------------- */
// Reseeded from js/menu-data.js whenever MENU_VERSION changes, so a copy
// of an older menu saved in this browser is replaced, not kept forever.
function loadDemoMenu(){
  const raw = localStorage.getItem(DEMO_MENU_STORE_KEY);
  if (raw && localStorage.getItem(DEMO_MENU_VERSION_KEY) === MENU_VERSION) return JSON.parse(raw);
  const seeded = DEMO_MENU_ITEMS.map(i => ({ ...i }));
  localStorage.setItem(DEMO_MENU_STORE_KEY, JSON.stringify(seeded));
  localStorage.setItem(DEMO_MENU_VERSION_KEY, MENU_VERSION);
  return seeded;
}

/* ---------------- sizes <-> text ----------------
   Sizes are edited as one line of text: "Half = 1550, Full = 2800".
   Blank means a single-price item. */
function optionsToText(options){
  return Array.isArray(options) && options.length
    ? options.map(o => `${o.label} = ${Number(o.price)}`).join(', ')
    : '';
}
function parseOptionsText(text){
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return { options: null };
  const options = [];
  for (const part of parts) {
    const match = part.match(/^(.+?)\s*=\s*(\d+(?:\.\d+)?)$/);
    if (!match) return { error: `Couldn't read "${part}". Use: Half = 1550, Full = 2800` };
    options.push({ label: match[1].trim(), price: Number(match[2]) });
  }
  return { options };
}
function formatItemPrice(item){
  return Array.isArray(item.options) && item.options.length
    ? item.options.map(o => `${o.label} ${Number(o.price).toFixed(0)}`).join(' / ')
    : `Rs ${Number(item.price).toFixed(0)}`;
}
function saveDemoMenu(items){ localStorage.setItem(DEMO_MENU_STORE_KEY, JSON.stringify(items)); }

// Everything rendered from the database goes through esc(): order fields
// are typed by customers on the public checkout form.
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const PAYMENT_LABELS = Object.fromEntries((CONFIG.PAYMENT_METHODS || []).map(m => [m.id, m.label]));

function loadDemoOrders(){ return JSON.parse(localStorage.getItem('bk_demo_orders') || '[]'); }
function saveDemoOrders(orders){ localStorage.setItem('bk_demo_orders', JSON.stringify(orders)); }

/* ---------------- menu panel ---------------- */
async function fetchMenuItems(){
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from('menu_items').select('*').order('sort_order', { ascending: true });
    if (!error) return data;
    console.warn('[admin] menu fetch failed', error);
  }
  return loadDemoMenu();
}

function renderMenuTable(){
  const wrap = document.getElementById('menuTableWrap');
  if (!dashboardMenuItems.length) {
    wrap.innerHTML = `<div class="empty-state">No menu items yet. Add your first one.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Popular</th><th>Available</th><th></th></tr></thead>
      <tbody>
        ${dashboardMenuItems.map(item => `
          <tr>
            <td>${esc(item.name)}</td>
            <td>${esc(item.category)}</td>
            <td>${formatItemPrice(item)}</td>
            <td>${item.is_popular ? '★' : ''}</td>
            <td><input type="checkbox" data-toggle-available="${item.id}" ${item.is_available ? 'checked' : ''}></td>
            <td style="display:flex;gap:.5rem;">
              <button class="icon-btn" data-edit="${item.id}">Edit</button>
              <button class="icon-btn danger" data-delete="${item.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('[data-toggle-available]').forEach(cb => {
    cb.addEventListener('change', () => toggleAvailability(cb.dataset.toggleAvailable, cb.checked));
  });
  wrap.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openItemModal(b.dataset.edit)));
  wrap.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.delete)));
}

async function toggleAvailability(id, isAvailable){
  const client = getSupabaseClient();
  if (client) {
    await client.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
  } else {
    const items = loadDemoMenu().map(i => String(i.id) === String(id) ? { ...i, is_available: isAvailable } : i);
    saveDemoMenu(items);
  }
  await loadMenuPanel();
}

async function deleteItem(id){
  if (!confirm('Delete this menu item?')) return;
  const client = getSupabaseClient();
  if (client) {
    await client.from('menu_items').delete().eq('id', id);
  } else {
    saveDemoMenu(loadDemoMenu().filter(i => String(i.id) !== String(id)));
  }
  await loadMenuPanel();
}

function openItemModal(id = null){
  editingItemId = id;
  const item = id ? dashboardMenuItems.find(i => String(i.id) === String(id)) : null;
  document.getElementById('itemModalTitle').textContent = item ? 'Edit item' : 'Add item';
  document.getElementById('itemName').value = item?.name || '';
  document.getElementById('itemDescription').value = item?.description || '';
  document.getElementById('itemPrice').value = item?.price || '';
  document.getElementById('itemSizes').value = optionsToText(item?.options);
  document.getElementById('itemSizesError').textContent = '';
  document.getElementById('itemCategory').value = item?.category || MENU_CATEGORY_ORDER[1];
  document.getElementById('itemImageUrl').value = item?.image_url || '';
  document.getElementById('itemSortOrder').value = item?.sort_order ?? 0;
  document.getElementById('itemAvailable').checked = item ? !!item.is_available : true;
  document.getElementById('itemPopular').checked = item ? !!item.is_popular : false;
  document.getElementById('itemModalOverlay').hidden = false;
}
function closeItemModal(){ document.getElementById('itemModalOverlay').hidden = true; }

async function saveItemForm(e){
  e.preventDefault();
  const sizesError = document.getElementById('itemSizesError');
  const { options, error } = parseOptionsText(document.getElementById('itemSizes').value);
  sizesError.textContent = error || '';
  if (error) return;

  const payload = {
    name: document.getElementById('itemName').value.trim(),
    description: document.getElementById('itemDescription').value.trim(),
    // With sizes, the base price is the first size's price.
    price: options ? options[0].price : Number(document.getElementById('itemPrice').value),
    options,
    category: document.getElementById('itemCategory').value,
    image_url: document.getElementById('itemImageUrl').value.trim(),
    sort_order: Number(document.getElementById('itemSortOrder').value) || 0,
    is_available: document.getElementById('itemAvailable').checked,
    is_popular: document.getElementById('itemPopular').checked
  };
  if (!payload.name || !payload.price) return;

  const client = getSupabaseClient();
  if (client) {
    if (editingItemId) await client.from('menu_items').update(payload).eq('id', editingItemId);
    else await client.from('menu_items').insert(payload);
  } else {
    const items = loadDemoMenu();
    if (editingItemId) {
      saveDemoMenu(items.map(i => String(i.id) === String(editingItemId) ? { ...i, ...payload } : i));
    } else {
      items.push({ id: crypto.randomUUID(), ...payload });
      saveDemoMenu(items);
    }
  }
  closeItemModal();
  await loadMenuPanel();
}

async function loadMenuPanel(){
  dashboardMenuItems = await fetchMenuItems();
  renderMenuTable();
}

/* ---------------- orders panel ---------------- */
async function fetchOrders(){
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (!error) return data;
    console.warn('[admin] orders fetch failed', error);
  }
  return loadDemoOrders().slice().reverse();
}

function statusBadge(status){ return `<span class="status-badge status-badge--${status}">${status}</span>`; }

function renderOrdersTable(){
  const wrap = document.getElementById('ordersTableWrap');
  if (!dashboardOrders.length) {
    wrap.innerHTML = `<div class="empty-state">No orders yet.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Branch</th><th>Type</th><th>Items</th><th>Total / payment</th><th>Status</th><th>Placed</th></tr></thead>
      <tbody>
        ${dashboardOrders.map(order => {
          const items = order.order_items || order.items || [];
          const itemsText = items.map(i => `${esc(i.quantity || i.qty)}x ${esc(i.name)}`).join(', ');
          const pay = PAYMENT_LABELS[order.payment_method] || order.payment_method || 'Cash on Delivery';
          return `
            <tr>
              <td><strong>${esc(order.order_no || '—')}</strong></td>
              <td>${esc(order.customer_name)}<br><small style="color:var(--muted)"><a href="tel:${esc(String(order.phone).replace(/[^0-9+]/g, ''))}">${esc(order.phone)}</a>${order.email ? `<br>${esc(order.email)}` : ''}</small></td>
              <td>${esc(order.branch || '—')}</td>
              <td>${esc(order.order_type)}${order.address ? `<br><small style="color:var(--muted)">${esc(order.address)}</small>` : ''}${order.notes ? `<br><small style="color:var(--accent)">Note: ${esc(order.notes)}</small>` : ''}</td>
              <td>${itemsText}</td>
              <td>Rs ${Number(order.total).toFixed(0)}<br><small style="color:var(--muted)">${esc(pay)}${order.payment_ref ? `<br>TID ${esc(order.payment_ref)}` : ''}</small></td>
              <td>
                <select class="admin-status-select" data-status="${esc(order.id)}">
                  ${['pending','preparing','ready','completed','cancelled'].map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
              <td><small>${new Date(order.created_at).toLocaleString()}</small></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('[data-status]').forEach(sel => {
    sel.addEventListener('change', () => updateOrderStatus(sel.dataset.status, sel.value));
  });
}

async function updateOrderStatus(id, status){
  const client = getSupabaseClient();
  if (client) {
    await client.from('orders').update({ status }).eq('id', id);
  } else {
    const orders = loadDemoOrders().map(o => o.id === id ? { ...o, status } : o);
    saveDemoOrders(orders);
  }
  await loadOrdersPanel();
}

async function loadOrdersPanel(){
  dashboardOrders = await fetchOrders();
  renderOrdersTable();
}

/* ---------------- tabs + wire-up ---------------- */
function initTabs(){
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(tab.dataset.panel).classList.add('is-active');
    });
  });
}

// Category dropdown mirrors the storefront's sections (minus the
// "Popular" filter, which is a checkbox, not a category).
function initCategorySelect(){
  document.getElementById('itemCategory').innerHTML = MENU_CATEGORY_ORDER
    .filter(cat => cat !== 'Popular')
    .map(cat => `<option>${cat}</option>`)
    .join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAdminAuth())) return;
  document.body.classList.add('is-authed');
  initTabs();
  initCategorySelect();

  document.getElementById('logoutBtn').addEventListener('click', adminLogout);
  document.getElementById('addItemBtn').addEventListener('click', () => openItemModal(null));
  document.getElementById('itemForm').addEventListener('submit', saveItemForm);
  document.getElementById('itemCancelBtn').addEventListener('click', closeItemModal);
  document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrdersPanel);

  await loadMenuPanel();
  await loadOrdersPanel();
});
