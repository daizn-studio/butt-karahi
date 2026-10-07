/* =========================================================
   BUTT KARAHI — site logic
   Menu rendering, scroll animations (GSAP + ScrollTrigger), cart,
   and checkout. Runs against Supabase when CONFIG has credentials,
   otherwise falls back to js/menu-data.js + localStorage so the
   site is fully clickable in demo mode.
========================================================= */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CART_KEY = 'bk_cart';
const DEMO_ORDERS_KEY = 'bk_demo_orders';

let menuItems = [];
let cart = loadCart();
let cartView = 'cart'; // 'cart' | 'checkout' | 'success'
let activeBranchId = null; // set in initMenu (saved choice, else first online branch)
let lastOrderSummary = null;

function formatRs(amount){ return `Rs ${Number(amount).toLocaleString('en-PK')}`; }

/* ---------------- header + mobile nav ---------------- */
function initHeader(){
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const links = document.querySelector('.nav-links');

  // --header-h: the fixed header's current height, so the menu's sticky
  // section bar sits right under it (the header shrinks once scrolled).
  const setHeaderHeight = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  setHeaderHeight();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setHeaderHeight);
  header.addEventListener('transitionend', setHeaderHeight);

  const setOpen = open => {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.innerHTML = open ? '&times;' : '&#9776;';
  };
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!links.classList.contains('is-open')); });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  // Tap outside / Escape closes the mobile menu.
  document.addEventListener('click', (e) => { if (links.classList.contains('is-open') && !links.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------------- menu ---------------- */
async function loadMenuItems(){
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('sort_order', { ascending: true });
    if (!error && data) return data;
    console.warn('[menu] Supabase fetch failed, falling back to demo data.', error);
  }
  return DEMO_MENU_ITEMS;
}

/* ---------------- branches ----------------
   The branch picker above the menu. Only branches with `online: true`
   in CONFIG.BRANCHES take orders from the site; the others show the
   same menu with "Call to order" instead of "Add to order". */
const BRANCH_KEY = 'bk_branch';
const BRANCHES = (CONFIG.BRANCHES && CONFIG.BRANCHES.length) ? CONFIG.BRANCHES : [{ id: 'main', name: 'Butt Karahi', online: true }];

function loadBranchId(){
  try {
    const saved = localStorage.getItem(BRANCH_KEY);
    if (BRANCHES.some(b => b.id === saved)) return saved;
  } catch {}
  return (BRANCHES.find(b => b.online) || BRANCHES[0]).id;
}
function currentBranch(){ return BRANCHES.find(b => b.id === activeBranchId) || BRANCHES[0]; }
function branchPhone(branch){ return branch.phone || CONFIG.WHATSAPP_NUMBER; }
function branchTel(branch){ return `tel:+${branchPhone(branch)}`; }

function renderBranchPicker(){
  const picker = document.getElementById('branchPicker');
  picker.innerHTML = BRANCHES.map(b => `
    <button type="button" class="branch-chip ${b.id === activeBranchId ? 'is-active' : ''}" role="radio" aria-checked="${b.id === activeBranchId}" data-branch="${b.id}">
      ${b.name}${b.tag ? `<small>${b.tag}</small>` : ''}
    </button>`).join('');
  picker.querySelectorAll('[data-branch]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.branch === activeBranchId) return;
    activeBranchId = btn.dataset.branch;
    try { localStorage.setItem(BRANCH_KEY, activeBranchId); } catch {}
    renderBranchPicker();
    updateOrderButtons();
    renderCart();
  }));

  const branch = currentBranch();
  document.getElementById('branchNote').innerHTML = branch.online
    ? `Online ordering open at <strong>${branch.name}</strong> — add dishes to your order below.`
    : `Online ordering for <strong>${branch.name}</strong> is coming soon. Prices shown are our DHA menu prices and may differ at this branch — <a href="${branchTel(branch)}">call to order</a>.`;
}

/* ---------------- menu ----------------
   The whole menu renders at once, one headed block per printed-menu
   section in the printed order (Appetizers, Karahi, BBQ, …). The sticky
   bar of section chips jumps between them and follows the scroll. */
function menuCategories(){
  const present = new Set(menuItems.map(i => i.category));
  const known = MENU_CATEGORY_ORDER.filter(cat => cat !== 'Popular' && present.has(cat));
  return [...known, ...[...present].filter(cat => !known.includes(cat))];
}
function sectionId(category){ return `menu-${menuSlug(category)}`; }

function renderMenuTabs(){
  const track = document.getElementById('menuNavTrack');
  track.innerHTML = menuCategories().map(cat => `
    <a class="menu-tab" href="#${sectionId(cat)}" data-section="${sectionId(cat)}">${cat}</a>
  `).join('');
  track.querySelectorAll('.menu-tab').forEach(chip => chip.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToMenuSection(chip.dataset.section);
  }));
}

// Scrolls a section's banner to just under the header + sticky chip bar.
function scrollToMenuSection(id){
  const target = document.getElementById(id);
  if (!target) return;
  const offset = -(document.getElementById('menuTabs').offsetHeight + document.getElementById('siteHeader').offsetHeight + 16);
  if (lenis) { lenis.scrollTo(target, { offset, duration: 1.2 }); return; }
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
}

function setActiveMenuTab(id){
  const track = document.getElementById('menuNavTrack');
  track.querySelectorAll('.menu-tab').forEach(chip => {
    const on = chip.dataset.section === id;
    chip.classList.toggle('is-active', on);
    if (on) {
      // Keep the active chip in view in the horizontally scrolling bar.
      const left = chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2;
      track.scrollTo({ left, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    }
  });
}

function renderMenuGrid(){
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = menuCategories().map((category, idx) => {
    const items = menuItems.filter(i => i.category === category);
    return `
    <section class="menu-section" id="${sectionId(category)}" aria-label="${category}">
      <header class="menu-section__head">
        <div class="menu-section__banner">
          <span class="menu-section__rule"></span>
          <span class="menu-section__gem" aria-hidden="true"></span>
          <h3 class="menu-section__title">${category}</h3>
          <span class="menu-section__gem" aria-hidden="true"></span>
          <span class="menu-section__rule menu-section__rule--end"></span>
        </div>
        <span class="menu-section__count">${String(idx + 1).padStart(2, '0')} · ${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
      </header>
      <div class="menu-grid">${items.map(menuCardHTML).join('')}</div>
    </section>`;
  }).join('');

  bindMenuCards(grid);
  updateOrderButtons();
  animateMenu(grid);
  refreshScroll();
}

// Cards without a photo get an ember-gradient block with a flame mark in
// the photo slot, so every card in a row lines up. Items with sizes get a
// row of size pills; the first is preselected and the headline price
// follows whichever pill is selected. The photo and name open the popup.
const FLAME_SVG = '<svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor"><path d="M12 2c.6 3.2-1.2 5.1-2.8 6.9C7.7 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.3-1-4.1-2.2-5.6-.3 1.4-1 2.5-2.1 3.1.4-3.9-.8-7.5-1.7-10.5Z"/></svg>';

function menuCardHTML(item){
  const soldOut = item.is_available === false;
  const options = itemOptions(item);
  return `
    <div class="menu-card ${soldOut ? 'is-unavailable' : ''}" data-item="${item.id}">
      <button type="button" class="menu-card__open" data-open="${item.id}" aria-label="View ${item.name}">
        ${item.image_url
          ? `<div class="menu-card__img"><img src="${item.image_url}" alt="${item.name}" loading="lazy"></div>`
          : `<div class="menu-card__img menu-card__img--blank" aria-hidden="true">${FLAME_SVG}</div>`}
        ${item.is_popular ? '<span class="menu-card__badge">Popular</span>' : ''}
        <span class="menu-card__zoom" aria-hidden="true">View</span>
      </button>
      <div class="menu-card__body">
        <div class="menu-card__row">
          <span class="menu-card__name" data-open="${item.id}">${item.name}</span>
          <span class="menu-card__price" data-price>${formatRs(options ? options[0].price : item.price)}</span>
        </div>
        ${item.description ? `<p class="menu-card__desc">${item.description}</p>` : ''}
        ${options ? `
        <div class="menu-card__sizes" role="radiogroup" aria-label="${item.name} size">
          ${options.map((o, i) => `
            <button type="button" class="size-pill ${i === 0 ? 'is-selected' : ''}" role="radio" aria-checked="${i === 0}" data-option="${i}">
              ${o.label}<span>${formatRs(o.price)}</span>
            </button>`).join('')}
        </div>` : ''}
        <div class="menu-card__action" data-action="${item.id}"></div>
      </div>
    </div>`;
}

// The card's order button: "Add to order" at an online branch, a call
// link at the others, "Sold out" when unavailable. Re-run on branch change.
function orderButtonHTML(item){
  const branch = currentBranch();
  if (item.is_available === false) return `<button class="menu-card__add" disabled>Sold out</button>`;
  if (!branch.online) return `<a class="menu-card__add menu-card__add--call" href="${branchTel(branch)}">Call to order</a>`;
  return `<button type="button" class="menu-card__add" data-add="${item.id}">Add to order</button>`;
}

function updateOrderButtons(){
  document.querySelectorAll('#menuGrid [data-action]').forEach(slot => {
    const item = menuItems.find(i => String(i.id) === slot.dataset.action);
    if (item) slot.innerHTML = orderButtonHTML(item);
  });
}

function selectedOption(card, item){
  const options = itemOptions(item);
  if (!options) return null;
  const pill = card.querySelector('.size-pill.is-selected');
  return options[pill ? pill.dataset.option : 0];
}

let menuGridBound = false;

function bindMenuCards(grid){
  grid.querySelectorAll('.menu-card__sizes').forEach(group => {
    const card = group.closest('.menu-card');
    const item = menuItems.find(i => String(i.id) === card.dataset.item);
    group.querySelectorAll('.size-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.size-pill').forEach(p => {
          p.classList.toggle('is-selected', p === pill);
          p.setAttribute('aria-checked', String(p === pill));
        });
        card.querySelector('[data-price]').textContent = formatRs(itemOptions(item)[pill.dataset.option].price);
      });
    });
  });

  // One delegated listener on the grid (bound once): the order buttons
  // inside it are re-rendered whenever the branch changes.
  if (menuGridBound) return;
  menuGridBound = true;
  grid.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      const card = opener.closest('.menu-card');
      const item = menuItems.find(i => String(i.id) === opener.dataset.open);
      if (item) openItemModal(item, selectedOption(card, item), opener);
      return;
    }
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const card = btn.closest('.menu-card');
    const item = menuItems.find(i => String(i.id) === btn.dataset.add);
    if (!item) return;
    addToCart(item, selectedOption(card, item));
    if (!REDUCED_MOTION && typeof gsap !== 'undefined') {
      gsap.fromTo(card, { scale: 1 }, { scale: 1.035, duration: .14, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
    }
  });
}

// Menu motion: each section's header wipes in (rules draw outward from the
// title, diamonds pop, title rises), and cards pop up (scale + lift, slight
// overshoot) row by row as they enter the viewport. Each section also
// drives which chip is highlighted in the sticky bar.
let menuTriggers = [];

function animateMenu(grid){
  menuTriggers.forEach(t => t.kill());
  menuTriggers = [];
  if (typeof ScrollTrigger === 'undefined' || typeof gsap === 'undefined') return;

  // Active-chip tracking runs even with reduced motion (it isn't motion).
  // Above the first section or below the last, no chip is lit.
  const sectionTriggers = [...grid.querySelectorAll('.menu-section')].map(section => ScrollTrigger.create({
    trigger: section, start: 'top 45%', end: 'bottom 45%',
    onToggle: self => {
      if (self.isActive) setActiveMenuTab(section.id);
      else if (!sectionTriggers.some(t => t.isActive)) setActiveMenuTab(null);
    }
  }));
  menuTriggers.push(...sectionTriggers);
  if (REDUCED_MOTION) return;

  grid.querySelectorAll('.menu-section__head').forEach(head => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 90%' } })
      .from(head.querySelector('.menu-section__rule'), { scaleX: 0, transformOrigin: 'right center', duration: .9, ease: 'power3.out' })
      .from(head.querySelector('.menu-section__rule--end'), { scaleX: 0, transformOrigin: 'left center', duration: .9, ease: 'power3.out' }, 0)
      .from(head.querySelectorAll('.menu-section__gem'), { scale: 0, rotate: 0, duration: .5, ease: 'back.out(3)' }, .25)
      .from(head.querySelectorAll('.menu-section__title, .menu-section__count'), { y: 26, opacity: 0, duration: .6, stagger: .08, ease: 'power3.out' }, 0);
    menuTriggers.push(tl.scrollTrigger);
  });

  // .is-popping switches off the card's CSS hover transition while GSAP
  // drives its transform, then clearProps hands it back to the CSS.
  const cards = grid.querySelectorAll('.menu-card');
  gsap.set(cards, { opacity: 0, y: 50, scale: .82 });
  // No `once: true` here: triggers that kill themselves on creation break
  // ScrollTrigger's refresh loop (seen after a resize + fast re-render).
  // Re-entering just re-runs a tween to the values the card already has.
  menuTriggers.push(...ScrollTrigger.batch(cards, {
    start: 'top 94%',
    onEnter: batch => {
      batch.forEach(card => card.classList.add('is-popping'));
      gsap.to(batch, {
        opacity: 1, y: 0, scale: 1, duration: .75, ease: 'back.out(1.7)', stagger: .09,
        clearProps: 'opacity,transform',
        onComplete: () => batch.forEach(card => card.classList.remove('is-popping'))
      });
    }
  }));
}

async function initMenu(){
  activeBranchId = loadBranchId();
  menuItems = await loadMenuItems();
  reconcileCart();
  renderBranchPicker();
  renderMenuTabs();
  renderMenuGrid();
}

/* ---------------- item popup ----------------
   Opened from a card's photo or name: large photo, the item's section,
   description, sizes, a quantity stepper and the order button. */
let modalItem = null;
let modalQty = 1;
let modalOption = 0;
let modalReturnFocus = null;

function openItemModal(item, option, returnFocus){
  modalItem = item;
  modalQty = 1;
  const options = itemOptions(item);
  modalOption = options && option ? Math.max(0, options.findIndex(o => o.label === option.label)) : 0;
  modalReturnFocus = returnFocus || null;

  const modal = document.getElementById('itemModal');
  const img = document.getElementById('itemModalImg');
  img.parentElement.classList.toggle('item-modal__media--blank', !item.image_url);
  if (item.image_url) { img.src = item.image_url; img.alt = item.name; img.hidden = false; }
  else { img.removeAttribute('src'); img.alt = ''; img.hidden = true; }
  renderItemModal();

  modal.hidden = false;
  document.body.classList.add('is-modal-open');
  if (lenis) lenis.stop();
  modal.querySelector('.item-modal__close').focus({ preventScroll: true });

  if (!REDUCED_MOTION && typeof gsap !== 'undefined') {
    gsap.timeline()
      .fromTo(modal.querySelector('.item-modal__backdrop'), { opacity: 0 }, { opacity: 1, duration: .3, ease: 'power1.out' })
      .fromTo(modal.querySelector('.item-modal__panel'), { opacity: 0, y: 60, scale: .88 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'back.out(1.5)', clearProps: 'transform' }, 0)
      .fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.1, ease: 'power3.out', clearProps: 'transform' }, 0)
      .from(modal.querySelectorAll('.item-modal__body > *'), { y: 18, opacity: 0, duration: .45, stagger: .05, ease: 'power2.out', clearProps: 'all' }, .15);
  }
}

function closeItemModal(){
  const modal = document.getElementById('itemModal');
  if (modal.hidden) return;
  const done = () => {
    modal.hidden = true;
    document.body.classList.remove('is-modal-open');
    if (lenis) lenis.start();
    if (modalReturnFocus) modalReturnFocus.focus({ preventScroll: true });
    modalItem = null;
  };
  if (REDUCED_MOTION || typeof gsap === 'undefined') { done(); return; }
  gsap.timeline({ onComplete: done })
    .to(modal.querySelector('.item-modal__panel'), { opacity: 0, y: 30, scale: .94, duration: .22, ease: 'power2.in', clearProps: 'all' })
    .to(modal.querySelector('.item-modal__backdrop'), { opacity: 0, duration: .22, clearProps: 'all' }, 0);
}

function renderItemModal(){
  const item = modalItem;
  const options = itemOptions(item);
  const unit = Number(options ? options[modalOption].price : item.price);
  const branch = currentBranch();
  const canOrder = branch.online && item.is_available !== false;
  const body = document.getElementById('itemModalBody');

  let action;
  if (item.is_available === false) action = `<button class="btn btn-primary btn-block" disabled>Sold out</button>`;
  else if (!branch.online) action = `<a class="btn btn-primary btn-block" href="${branchTel(branch)}">Call ${branch.name} to order</a>
    <p class="item-modal__hint">Online ordering at ${branch.name} is coming soon.</p>`;
  else action = `<button type="button" class="btn btn-primary btn-block" id="modalAddBtn">Add ${modalQty} to order · ${formatRs(unit * modalQty)}</button>`;

  body.innerHTML = `
    <p class="eyebrow">${item.category}${item.is_popular ? ' · <span class="item-modal__popular">Popular</span>' : ''}</p>
    <h3 class="item-modal__name" id="itemModalName">${item.name}</h3>
    <p class="item-modal__price">${formatRs(unit)}</p>
    ${item.description ? `<p class="item-modal__desc">${item.description}</p>` : ''}
    ${options ? `
    <div class="item-modal__group">
      <p class="item-modal__label">Size</p>
      <div class="menu-card__sizes" role="radiogroup" aria-label="${item.name} size">
        ${options.map((o, i) => `
          <button type="button" class="size-pill ${i === modalOption ? 'is-selected' : ''}" role="radio" aria-checked="${i === modalOption}" data-modal-option="${i}">
            ${o.label}<span>${formatRs(o.price)}</span>
          </button>`).join('')}
      </div>
    </div>` : ''}
    ${canOrder ? `
    <div class="item-modal__group">
      <p class="item-modal__label">Quantity</p>
      <div class="qty-stepper">
        <button type="button" data-modal-qty="-1" aria-label="Fewer" ${modalQty <= 1 ? 'disabled' : ''}>−</button>
        <span aria-live="polite">${modalQty}</span>
        <button type="button" data-modal-qty="1" aria-label="More">+</button>
      </div>
    </div>` : ''}
    <div class="item-modal__action">${action}</div>`;

  body.querySelectorAll('[data-modal-option]').forEach(pill => pill.addEventListener('click', () => {
    modalOption = Number(pill.dataset.modalOption);
    renderItemModal();
    body.querySelector(`[data-modal-option="${modalOption}"]`)?.focus();
  }));
  body.querySelectorAll('[data-modal-qty]').forEach(btn => btn.addEventListener('click', () => {
    modalQty = Math.max(1, modalQty + Number(btn.dataset.modalQty));
    renderItemModal();
    body.querySelector(`[data-modal-qty="${btn.dataset.modalQty}"]:not([disabled])`)?.focus();
  }));
  document.getElementById('modalAddBtn')?.addEventListener('click', () => {
    const chosen = options ? options[modalOption] : null;
    const qty = modalQty;
    closeItemModal();
    addToCart(item, chosen, qty);
  });
}

function initItemModal(){
  const modal = document.getElementById('itemModal');
  modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', closeItemModal));
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeItemModal(); return; }
    // Keep Tab inside the popup while it's open.
    if (e.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

// An item's sizes as [{ label, price }], or null for single-price items.
// (From Supabase, `options` is a jsonb column and may be null.)
function itemOptions(item){
  return Array.isArray(item.options) && item.options.length ? item.options : null;
}

/* ---------------- scroll animations ---------------- */
function animateIn(elements){
  if (REDUCED_MOTION || typeof gsap === 'undefined') return;
  elements.forEach(el => {
    gsap.fromTo(el, { y: 40, opacity: 0 }, {
      y: 0, opacity: 1, duration: .8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });
}

function initScrollAnimations(){
  if (REDUCED_MOTION || typeof gsap === 'undefined') return;

  // Generic fade-up elements outside the menu grid (menu cards animate on render).
  animateIn(document.querySelectorAll('[data-animate="fade-up"]'));

  // Title-card breaks: bold scale + fade as they cross the viewport.
  document.querySelectorAll('[data-title-card]').forEach(card => {
    const text = card.querySelector('.title-card__text');
    gsap.fromTo(text, { scale: .75, opacity: 0 }, {
      scale: 1, opacity: 1, ease: 'power2.out',
      scrollTrigger: { trigger: card, start: 'top 75%', end: 'top 30%', scrub: true }
    });
  });
}

// Hero: a load-in, then a scroll sequence. #hero is pinned for 3 extra
// viewport heights and one scrubbed timeline plays across it (0 → 1).
// Phases overlap and use sine easing so nothing starts or stops hard:
//   0.00–0.25  footer + scroll cue drop away
//   0.00–1.00  the video pushes in (scale 1 → 1.3), leaning into the pan
//   0.08–0.58  the two title lines split apart sideways, headline lifts out
//   0.35–0.75  the frame darkens and "Cooked on the flame / since 1947" rises in
//   0.55–1.00  the full-bleed video tightens into an inset, rounded card
// then the pin releases and the card scrolls away into the stats band.
// scrub: 1.5 lets the animation ease after the scroll position rather
// than tracking it 1:1; Lenis (initSmoothScroll) smooths the scroll itself.
// Load-in tweens only touch inner elements (line spans, footer children)
// and the scroll timeline only touches their wrappers, so the two never
// fight over the same property.
function initHero(){
  const hero = document.getElementById('hero');
  // Un-hide the hero (css: .js:not(.hero-ready)). The GSAP from-states
  // below are applied in the same frame, so nothing paints in between.
  const ready = () => document.documentElement.classList.add('hero-ready');
  if (!hero || REDUCED_MOTION || typeof gsap === 'undefined') { ready(); return; }

  const dish = hero.querySelector('.hero__dish');
  const media = hero.querySelector('.hero__dish-media');
  const [line1, line2] = hero.querySelectorAll('.hero__line');

  // The video fades in once it has a frame to show (its poster is that
  // same first frame, so the fallback after 1.8s looks identical).
  gsap.set(dish, { autoAlpha: 0 });
  ready();
  let dishShown = false;
  const showDish = () => {
    if (dishShown) return;
    dishShown = true;
    gsap.to(dish, { autoAlpha: 1, duration: 1.1, ease: 'power2.out' });
  };
  if (media && media.tagName === 'VIDEO') {
    if (media.readyState >= 2) showDish();
    else {
      media.addEventListener('loadeddata', showDish, { once: true });
      media.addEventListener('playing', showDish, { once: true });
      setTimeout(showDish, 1800);
    }
    media.play?.().catch(() => {}); // iOS low-power mode blocks autoplay: poster stays
  } else showDish();

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from(hero.querySelectorAll('.hero__line > span'), { yPercent: 110, duration: 1, stagger: .12 }, .2)
    .from([hero.querySelector('.eyebrow'), hero.querySelector('.hero__since')], { y: 20, autoAlpha: 0, duration: .8, stagger: .1 }, .5)
    .from(hero.querySelectorAll('.hero__footer > *'), { y: 24, autoAlpha: 0, duration: .8, stagger: .08 }, .7)
    .from(hero.querySelectorAll('.hero__scroll-cue > *'), { autoAlpha: 0, duration: .6 }, 1.1);

  gsap.timeline({
    defaults: { ease: 'sine.inOut' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=300%',
      scrub: 1.5,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  })
    .to(media, { scale: 1.3, duration: 1, ease: 'none' }, 0)
    .to([hero.querySelector('.hero__footer'), hero.querySelector('.hero__scroll-cue')], { y: 40, autoAlpha: 0, duration: .25 }, 0)
    .to(line1, { x: () => -window.innerWidth * .6, duration: .5 }, .08)
    .to(line2, { x: () => window.innerWidth * .6, duration: .5 }, .08)
    .to(hero.querySelector('.hero__headline'), { y: -80, autoAlpha: 0, duration: .5 }, .08)
    .to(hero.querySelector('.hero__shade'), { opacity: 1, duration: .4 }, .35)
    .fromTo(hero.querySelector('.hero__reveal'),
      { autoAlpha: 0, y: 60, scale: .88 },
      { autoAlpha: 1, y: 0, scale: 1, duration: .35, ease: 'sine.out' }, .4)
    .fromTo(dish,
      { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
      { clipPath: 'inset(7% 5% 7% 5% round 28px)', duration: .45 }, .55);
}

// Re-measure every ScrollTrigger after anything changes page height
// (menu render, tab switch, late-loading images).
function refreshScroll(){
  if (!REDUCED_MOTION && typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
}

/* ---------------- smooth scroll ----------------
   Lenis turns stepped mouse-wheel jumps into eased, momentum scrolling,
   driven off GSAP's ticker so ScrollTrigger updates on the same frame.
   Scrollable panels opt out with data-lenis-prevent (the cart drawer). */
let lenis = null;

function initSmoothScroll(){
  if (REDUCED_MOTION || typeof Lenis === 'undefined' || typeof gsap === 'undefined') return;
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- anchor links ----------------
   Smooth-scrolled here rather than with CSS scroll-behavior, which
   corrupts ScrollTrigger's pin measurements. */
function scrollToHash(hash, behavior = 'smooth'){
  const target = hash && hash !== '#' ? document.querySelector(hash) : null;
  const immediate = REDUCED_MOTION || behavior === 'auto';
  if (lenis) {
    lenis.scrollTo(target || 0, { immediate, duration: 1.6 });
    return;
  }
  const top = target ? target.getBoundingClientRect().top + window.scrollY : 0;
  window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
}

function initAnchorLinks(){
  document.querySelectorAll('a[href^="#"]:not(#navOrderBtn)').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = a.getAttribute('href');
      history.replaceState(null, '', hash === '#' ? location.pathname : hash);
      scrollToHash(hash);
    });
  });
}

/* ---------------- cart ---------------- */
function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(){ try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// A cart line is one item in one size: `key` is the item id, plus
// "::<size>" for sized items, so Half and Full are separate lines. The
// size is folded into `name` ("Butter Chicken (Half)"), which is what
// the order, WhatsApp message and admin dashboard all display.
function cartLineFor(item, option){
  return {
    key: option ? `${item.id}::${option.label}` : String(item.id),
    id: item.id,
    option: option ? option.label : null,
    name: option ? `${item.name} (${option.label})` : item.name,
    price: Number(option ? option.price : item.price),
    image: item.image_url || null
  };
}

function addToCart(item, option = null, qty = 1){
  const fresh = cartLineFor(item, option);
  const line = cart.find(l => l.key === fresh.key);
  if (line) line.qty += qty;
  else cart.push({ ...fresh, qty });
  saveCart();
  renderCart();
  bumpCartFab();
  showToast(`<strong>${qty > 1 ? `${qty} × ` : ''}${escapeHtml(fresh.name)}</strong> added to your order`, { label: 'View cart', onClick: openCart });
}

// A cart saved in localStorage before a menu change could hold items or
// sizes that no longer exist, or old prices. Drop the former and re-price
// the rest from the current menu, so checkout never uses stale prices.
function reconcileCart(){
  cart = cart.flatMap(line => {
    const item = menuItems.find(i => String(i.id) === String(line.id));
    if (!item || item.is_available === false) return [];
    const options = itemOptions(item);
    const option = options ? options.find(o => o.label === line.option) : null;
    if (options ? !option : line.option) return [];
    const qty = Math.max(1, Math.min(99, parseInt(line.qty, 10) || 1));
    return [{ ...cartLineFor(item, option), qty }];
  });
  saveCart();
  renderCart();
}

function changeQty(key, delta){
  const line = cart.find(l => l.key === key);
  if (!line) return;
  line.qty = Math.min(99, line.qty + delta);
  if (line.qty <= 0) cart = cart.filter(l => l !== line);
  saveCart();
  renderCart();
}

function removeLine(key){
  cart = cart.filter(l => l.key !== key);
  saveCart();
  renderCart();
}

function cartSubtotal(){ return cart.reduce((sum, l) => sum + l.price * l.qty, 0); }
function cartTotal(){ return cartSubtotal(); }
function cartCount(){ return cart.reduce((sum, l) => sum + l.qty, 0); }
function deliveryFee(orderType){ return orderType === 'delivery' ? Number(CONFIG.DELIVERY_FEE || 0) : 0; }

function openCart(){
  const drawer = document.getElementById('cartDrawer');
  if (drawer.classList.contains('is-open')) return;
  hideToast();
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.getElementById('overlay').classList.add('is-open');
  document.body.classList.add('is-cart-open');
  if (lenis) lenis.stop();
  setTimeout(() => document.getElementById('cartClose').focus({ preventScroll: true }), 50);
}
function closeCart(){
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  document.getElementById('overlay').classList.remove('is-open');
  document.body.classList.remove('is-cart-open');
  if (lenis && document.getElementById('itemModal').hidden) lenis.start();
  // Keep a half-filled checkout form if they close and come back; only a
  // finished order resets to the cart.
  if (cartView === 'success') { cartView = 'cart'; renderCart(); }
}

function bumpCartFab(){
  const fab = document.getElementById('cartFab');
  fab.classList.remove('is-bumping');
  void fab.offsetWidth; // restart the CSS animation
  fab.classList.add('is-bumping');
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function showToast(html, action){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<span class="toast__icon" aria-hidden="true">✓</span><span class="toast__msg">${html}</span>${action ? `<button type="button" class="toast__action">${action.label}</button>` : ''}`;
  if (action) toast.querySelector('.toast__action').addEventListener('click', () => { hideToast(); action.onClick(); });
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3800);
}
function hideToast(){
  clearTimeout(toastTimer);
  document.getElementById('toast')?.classList.remove('is-visible');
}

/* ---------------- checkout helpers ---------------- */
// Pakistani mobile numbers: accepts 03001234567, 0300-1234567,
// +92 300 1234567, 923001234567, 3001234567. Returns "0300-1234567" or null.
function normalizePkMobile(raw){
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^3\d{9}$/.test(digits)) return null;
  return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
}
function isValidEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }

// e.g. BK-261002-4831 (date + 4 random digits) — what the customer quotes
// on the phone / WhatsApp and what the dashboard shows.
function makeOrderNo(){
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.random() * 1e9) % 10000;
  return `BK-${ymd}-${String(rand).padStart(4, '0')}`;
}
function makeUuid(){
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function paymentMethods(){ return (CONFIG.PAYMENT_METHODS || [{ id: 'cod', label: 'Cash on Delivery', enabled: true }]).filter(m => m.enabled !== false); }
function paymentMethod(id){ return paymentMethods().find(m => m.id === id) || paymentMethods()[0]; }
function paymentLabel(method, orderType){ return orderType === 'pickup' && method.pickupLabel ? method.pickupLabel : method.label; }
function paymentHasAccount(method){ return !!(method.account && String(method.account).trim()); }
function paymentAccountHTML(method){
  if (method.id === 'cod') return '';
  if (!paymentHasAccount(method)) return `<p>We'll send our ${escapeHtml(method.label)} account details on WhatsApp when we confirm your order. Please don't pay before that.</p>`;
  return `
    <dl class="pay-account">
      ${method.bankName ? `<dt>Bank</dt><dd>${escapeHtml(method.bankName)}</dd>` : ''}
      ${method.accountTitle ? `<dt>Account title</dt><dd>${escapeHtml(method.accountTitle)}</dd>` : ''}
      <dt>${method.id === 'bank' ? 'Account / IBAN' : 'Account number'}</dt><dd><strong>${escapeHtml(method.account)}</strong></dd>
    </dl>`;
}

// Common Lahore areas, offered as suggestions in the Area field.
const LAHORE_AREAS = ['DHA Phase 1','DHA Phase 2','DHA Phase 3','DHA Phase 4','DHA Phase 5','DHA Phase 6','DHA Phase 7','DHA Phase 8','Gulberg I','Gulberg II','Gulberg III','Model Town','Johar Town','Garden Town','Faisal Town','Township','Allama Iqbal Town','Wapda Town','Bahria Town','Valencia Town','Lake City','Askari','Cantt','Cavalry Ground','Shadman','Samanabad','Mozang','McLeod Road','Lakshmi Chowk','Royal Park','Mall Road','Walled City (Androon Shehar)','Ichhra','Shalimar','Shadbagh','Batapur','Mughalpura','Harbanspura','Raiwind Road','Thokar Niaz Baig','Sabzazar','EME Society','Paragon City','State Life Society','Punjab Society','Canal View','Ferozepur Road','Multan Road'];

const CUSTOMER_KEY = 'bk_customer';
function loadCustomer(){ try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {}; } catch { return {}; } }
function saveCustomer(data){ try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); } catch {} }
function forgetCustomer(){ try { localStorage.removeItem(CUSTOMER_KEY); } catch {} }

// The checkout form's current values survive re-renders (e.g. switching
// pickup ↔ delivery) and closing/reopening the drawer.
let checkoutDraft = null;

function readCheckoutForm(){
  const val = id => (document.getElementById(id)?.value || '').trim();
  return {
    name: val('ckName'),
    phone: val('ckPhone'),
    email: val('ckEmail'),
    order_type: document.querySelector('input[name="ckType"]:checked')?.value || 'delivery',
    house: val('ckHouse'),
    area: val('ckArea'),
    landmark: val('ckLandmark'),
    payment: document.querySelector('input[name="ckPay"]:checked')?.value || 'cod',
    payment_ref: val('ckPayRef'),
    notes: val('ckNotes'),
    remember: document.getElementById('ckRemember')?.checked ?? true
  };
}

function stepsHTML(active){
  const steps = ['Cart', 'Details', 'Confirmed'];
  return `<ol class="checkout-steps" aria-label="Checkout progress">${steps.map((s, i) => `
    <li class="${i < active ? 'is-done' : ''} ${i === active ? 'is-current' : ''}" ${i === active ? 'aria-current="step"' : ''}><span>${i < active ? '✓' : i + 1}</span>${s}</li>`).join('')}</ol>`;
}

function summaryLinesHTML(lines){
  return lines.map(l => `
    <div class="summary-line"><span><b>${l.qty}×</b> ${escapeHtml(l.name)}</span><span>${formatRs(l.qty * l.price)}</span></div>`).join('');
}

/* ---------------- cart drawer views ---------------- */
function renderCart(){
  const count = cartCount();
  const countEl = document.getElementById('cartCount');
  countEl.textContent = count;
  countEl.hidden = count === 0;
  document.getElementById('cartFab').setAttribute('aria-label', `Open cart, ${count} item${count === 1 ? '' : 's'}`);
  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFoot');
  const title = document.getElementById('cartTitle');

  if (cartView === 'success') { renderSuccess(body, foot, title); return; }
  if (cartView === 'checkout' && cart.length) { renderCheckout(body, foot, title); return; }
  cartView = 'cart';
  title.textContent = 'Your Order';

  if (!cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">${FLAME_SVG}</div>
        <p><strong>Your order is empty.</strong><br>Add a karahi or two from the menu.</p>
        <a href="#menu" class="btn btn-outline" id="cartBrowseBtn">Browse the menu</a>
      </div>`;
    foot.innerHTML = '';
    document.getElementById('cartBrowseBtn').addEventListener('click', (e) => { e.preventDefault(); closeCart(); scrollToHash('#menu'); });
    return;
  }

  body.innerHTML = stepsHTML(0) + cart.map(line => `
    <div class="cart-line" data-line="${escapeHtml(line.key)}">
      ${line.image ? `<img class="cart-line__img" src="${escapeHtml(line.image)}" alt="" loading="lazy">` : `<div class="cart-line__img cart-line__img--blank" aria-hidden="true">${FLAME_SVG}</div>`}
      <div class="cart-line__info">
        <div class="cart-line__name">${escapeHtml(line.name)}</div>
        <div class="cart-line__price">${formatRs(line.price)} each</div>
        <button type="button" class="cart-line__remove" data-remove="${escapeHtml(line.key)}">Remove</button>
      </div>
      <div class="cart-line__right">
        <div class="cart-line__total">${formatRs(line.price * line.qty)}</div>
        <div class="cart-line__qty">
          <button type="button" data-qty-down="${escapeHtml(line.key)}" aria-label="One less ${escapeHtml(line.name)}">−</button>
          <span aria-live="polite">${line.qty}</span>
          <button type="button" data-qty-up="${escapeHtml(line.key)}" aria-label="One more ${escapeHtml(line.name)}" ${line.qty >= 99 ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>
  `).join('');

  body.querySelectorAll('[data-qty-up]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyUp, 1)));
  body.querySelectorAll('[data-qty-down]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyDown, -1)));
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeLine(b.dataset.remove)));

  const subtotal = cartSubtotal();
  const belowMinimum = subtotal < MINIMUM_ORDER_AMOUNT;
  const branch = currentBranch();
  const onlineBranch = BRANCHES.find(b => b.online);
  foot.innerHTML = `
    <p class="cart-branch">Ordering from <strong>${escapeHtml(branch.name)}</strong></p>
    <div class="cart-subtotal"><span>Subtotal</span><span>${formatRs(subtotal)}</span></div>
    ${!branch.online
      ? `<p class="field-error" style="margin-bottom:.8rem">Online ordering at ${escapeHtml(branch.name)} is coming soon.${onlineBranch ? ` Switch to ${escapeHtml(onlineBranch.name)} or call to order.` : ' Please call to order.'}</p>
         ${onlineBranch ? `<button type="button" class="btn btn-primary btn-block" id="switchBranchBtn">Order from ${escapeHtml(onlineBranch.name)}</button>` : ''}
         <a class="btn btn-outline btn-block" style="margin-top:.7rem" href="${branchTel(branch)}">Call ${escapeHtml(branch.name)}</a>`
      : `${belowMinimum
          ? `<div class="min-meter"><div class="min-meter__bar"><i style="width:${Math.min(100, subtotal / MINIMUM_ORDER_AMOUNT * 100)}%"></i></div><p class="field-error">Add ${formatRs(MINIMUM_ORDER_AMOUNT - subtotal)} more — minimum order is ${formatRs(MINIMUM_ORDER_AMOUNT)}.</p></div>`
          : `<p class="cart-note">🛵 Free home delivery across ${escapeHtml(CONFIG.DELIVERY_CITY || 'Lahore')}</p>`}
    <button type="button" class="btn btn-primary btn-block" id="checkoutBtn" ${belowMinimum ? 'disabled' : ''}>Checkout · ${formatRs(subtotal)}</button>`}`;
  document.getElementById('checkoutBtn')?.addEventListener('click', () => { cartView = 'checkout'; renderCart(); body.scrollTop = 0; });
  document.getElementById('switchBranchBtn')?.addEventListener('click', () => {
    activeBranchId = onlineBranch.id;
    try { localStorage.setItem(BRANCH_KEY, activeBranchId); } catch {}
    renderBranchPicker();
    updateOrderButtons();
    renderCart();
  });
}

function renderCheckout(body, foot, title){
  title.textContent = 'Checkout';
  const saved = loadCustomer();
  const d = checkoutDraft || {
    name: saved.name || '', phone: saved.phone || '', email: saved.email || '',
    order_type: saved.order_type || 'delivery', house: saved.house || '', area: saved.area || '',
    landmark: saved.landmark || '', payment: saved.payment || 'cod', payment_ref: '', notes: '', remember: true
  };
  if (!paymentMethods().some(m => m.id === d.payment)) d.payment = paymentMethods()[0].id;
  const branch = currentBranch();
  const isDelivery = d.order_type === 'delivery';
  const method = paymentMethod(d.payment);
  const subtotal = cartSubtotal();
  const fee = deliveryFee(d.order_type);
  const city = CONFIG.DELIVERY_CITY || 'Lahore';

  body.innerHTML = `
    ${stepsHTML(1)}
    <form class="checkout-fields" id="checkoutForm" novalidate>
      <fieldset class="ck-group">
        <legend>Your details</legend>
        <div class="field">
          <label for="ckName">Full name <span class="req">*</span></label>
          <input type="text" id="ckName" name="name" autocomplete="name" maxlength="60" required placeholder="e.g. Muhammad Ali Khan" value="${escapeHtml(d.name)}">
        </div>
        <div class="field">
          <label for="ckPhone">Mobile number <span class="req">*</span></label>
          <input type="tel" id="ckPhone" name="phone" autocomplete="tel" inputmode="tel" maxlength="16" required placeholder="03XX XXXXXXX" value="${escapeHtml(d.phone)}">
          <small class="field-hint">Pakistani mobile, e.g. 0300 1234567 or +92 300 1234567. We'll call to confirm your order.</small>
        </div>
        <div class="field">
          <label for="ckEmail">Email <span class="req">*</span></label>
          <input type="email" id="ckEmail" name="email" autocomplete="email" maxlength="80" required placeholder="you@example.com" value="${escapeHtml(d.email)}">
        </div>
      </fieldset>

      <fieldset class="ck-group">
        <legend>Delivery or pickup</legend>
        <div class="segmented" role="radiogroup">
          <label class="segmented__opt"><input type="radio" name="ckType" value="delivery" ${isDelivery ? 'checked' : ''}><span>🛵 Delivery</span></label>
          <label class="segmented__opt"><input type="radio" name="ckType" value="pickup" ${!isDelivery ? 'checked' : ''}><span>🥡 Pickup</span></label>
        </div>
        ${isDelivery ? `
        <div class="field">
          <label for="ckHouse">House / flat no. &amp; street <span class="req">*</span></label>
          <input type="text" id="ckHouse" autocomplete="address-line1" maxlength="120" placeholder="e.g. House 12, Street 5, Block C" value="${escapeHtml(d.house)}">
        </div>
        <div class="field-row">
          <div class="field">
            <label for="ckArea">Area / society <span class="req">*</span></label>
            <input type="text" id="ckArea" list="ckAreaList" autocomplete="address-level3" maxlength="60" placeholder="e.g. DHA Phase 5" value="${escapeHtml(d.area)}">
            <datalist id="ckAreaList">${LAHORE_AREAS.map(a => `<option value="${a}">`).join('')}</datalist>
          </div>
          <div class="field">
            <label for="ckCity">City</label>
            <input type="text" id="ckCity" value="${escapeHtml(city)}" readonly aria-readonly="true">
          </div>
        </div>
        <div class="field">
          <label for="ckLandmark">Nearest landmark <small>(optional)</small></label>
          <input type="text" id="ckLandmark" maxlength="80" placeholder="e.g. near Masjid / park / school" value="${escapeHtml(d.landmark)}">
        </div>
        <p class="field-hint">We deliver free across ${escapeHtml(city)} only.</p>` : `
        <div class="pickup-card">
          <strong>Pickup from ${escapeHtml(branch.name)}</strong>
          <p>We'll call you when it's ready. Questions? <a href="${branchTel(branch)}">Call ${escapeHtml(CONFIG.PHONE_DELIVERY || branchPhone(branch))}</a></p>
        </div>`}
      </fieldset>

      <fieldset class="ck-group">
        <legend>Payment method</legend>
        <div class="pay-options">
          ${paymentMethods().map(m => `
          <label class="pay-option pay-option--${m.id}${m.id === method.id ? ' is-checked' : ''}">
            <input type="radio" name="ckPay" value="${m.id}" ${m.id === method.id ? 'checked' : ''}>
            <span class="pay-option__mark" aria-hidden="true">${m.id === 'cod' ? '₨' : m.id === 'jazzcash' ? 'JC' : m.id === 'easypaisa' ? 'EP' : '🏦'}</span>
            <span class="pay-option__text"><strong>${escapeHtml(paymentLabel(m, d.order_type))}</strong><small>${escapeHtml(d.order_type === 'pickup' && m.pickupNote ? m.pickupNote : m.note || '')}</small></span>
          </label>`).join('')}
        </div>
        ${method.id !== 'cod' ? `
        <div class="pay-details">
          ${paymentAccountHTML(method)}
          ${paymentHasAccount(method) ? `
          <div class="field">
            <label for="ckPayRef">Transaction ID (TID) <small>(optional — if you've already paid)</small></label>
            <input type="text" id="ckPayRef" maxlength="40" placeholder="e.g. 012345678901" value="${escapeHtml(d.payment_ref)}">
          </div>` : ''}
        </div>` : ''}
      </fieldset>

      <div class="field">
        <label for="ckNotes">Special instructions <small>(optional)</small></label>
        <textarea id="ckNotes" maxlength="300" placeholder="Less spicy, extra raita, ring the bell twice…">${escapeHtml(d.notes)}</textarea>
      </div>

      <label class="check-row"><input type="checkbox" id="ckRemember" ${d.remember ? 'checked' : ''}> Save my details on this device for next time</label>

      <div class="order-summary">
        <p class="order-summary__title">Order summary · ${escapeHtml(branch.name)}</p>
        ${summaryLinesHTML(cart)}
        <div class="summary-line summary-line--muted"><span>Subtotal</span><span>${formatRs(subtotal)}</span></div>
        <div class="summary-line summary-line--muted"><span>${isDelivery ? 'Delivery' : 'Pickup'}</span><span>${fee ? formatRs(fee) : 'FREE'}</span></div>
      </div>
      <div class="field-error" id="checkoutError" role="alert"></div>
    </form>`;

  foot.innerHTML = `
    <div class="cart-subtotal"><span>Total</span><span>${formatRs(subtotal + fee)}</span></div>
    <button type="submit" form="checkoutForm" class="btn btn-primary btn-block" id="placeOrderBtn" ${subtotal < MINIMUM_ORDER_AMOUNT ? 'disabled' : ''}>Place Order · ${formatRs(subtotal + fee)}</button>
    <button type="button" class="btn btn-ghost btn-block" id="backToCartBtn">← Back to cart</button>`;

  const form = document.getElementById('checkoutForm');
  // Re-render on choices that change the form's shape, keeping typed values.
  form.querySelectorAll('input[name="ckType"], input[name="ckPay"]').forEach(r => r.addEventListener('change', () => {
    checkoutDraft = readCheckoutForm();
    const scroll = body.scrollTop;
    renderCart();
    body.scrollTop = scroll;
  }));
  form.addEventListener('input', (e) => {
    e.target.closest('.field')?.classList.remove('has-error');
    checkoutDraft = readCheckoutForm();
  });
  document.getElementById('ckPhone').addEventListener('blur', (e) => {
    const n = normalizePkMobile(e.target.value);
    if (n) e.target.value = n;
  });
  form.addEventListener('submit', handlePlaceOrder);
  document.getElementById('backToCartBtn').addEventListener('click', () => { checkoutDraft = readCheckoutForm(); cartView = 'cart'; renderCart(); });
}

function renderSuccess(body, foot, title){
  const o = lastOrderSummary;
  title.textContent = 'Order Confirmed';
  const method = paymentMethod(o.payment_method);
  // Without a database the order only exists in this browser, so it
  // reaches the restaurant only when the customer sends it on WhatsApp.
  const viaWhatsApp = !IS_LIVE_BACKEND && !!CONFIG.WHATSAPP_NUMBER;
  if (viaWhatsApp) title.textContent = 'One Last Step';
  body.innerHTML = `
    ${stepsHTML(2)}
    <div class="order-success">
      <div class="order-success__tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h3>Shukriya, ${escapeHtml(o.customer_name.split(' ')[0])}!</h3>
      ${viaWhatsApp
        ? `<p class="order-success__alert">Tap <strong>Send order on WhatsApp</strong> below to send it to us — your order is placed once we receive it. We'll then call <strong>${escapeHtml(o.phone)}</strong> to confirm.</p>`
        : `<p>Your order has been received. Our team will call you on <strong>${escapeHtml(o.phone)}</strong> to confirm it.</p>`}
      <p class="order-success__no">Order no. <strong>${escapeHtml(o.order_no)}</strong></p>
    </div>
    <div class="order-summary">
      <p class="order-summary__title">${escapeHtml(o.branch)} · ${o.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
      ${summaryLinesHTML(o.items)}
      <div class="summary-line summary-line--muted"><span>${o.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span><span>${o.delivery_fee ? formatRs(o.delivery_fee) : 'FREE'}</span></div>
      <div class="summary-line summary-line--total"><span>Total</span><span>${formatRs(o.total)}</span></div>
    </div>
    <dl class="receipt">
      <dt>Name</dt><dd>${escapeHtml(o.customer_name)}</dd>
      <dt>Mobile</dt><dd>${escapeHtml(o.phone)}</dd>
      <dt>Email</dt><dd>${escapeHtml(o.email)}</dd>
      ${o.address ? `<dt>Address</dt><dd>${escapeHtml(o.address)}</dd>` : ''}
      <dt>Payment</dt><dd>${escapeHtml(paymentLabel(method, o.order_type))}${o.payment_ref ? ` · TID ${escapeHtml(o.payment_ref)}` : ''}</dd>
      ${o.notes ? `<dt>Notes</dt><dd>${escapeHtml(o.notes)}</dd>` : ''}
    </dl>
    ${method.id !== 'cod' ? `<div class="pay-details">${paymentAccountHTML(method)}${paymentHasAccount(method) && !o.payment_ref ? `<p>Please send ${formatRs(o.total)} and share the transaction ID with us on WhatsApp, quoting order <strong>${escapeHtml(o.order_no)}</strong>.</p>` : ''}</div>` : ''}`;
  foot.innerHTML = `
    ${CONFIG.WHATSAPP_NUMBER ? `<a class="btn btn-whatsapp btn-block" target="_blank" rel="noopener" href="${whatsappOrderLink(o)}">Send order on WhatsApp</a>` : ''}
    <button type="button" class="btn btn-ghost btn-block" id="cartDoneBtn">Done</button>`;
  document.getElementById('cartDoneBtn').addEventListener('click', closeCart);
}

/* ---------------- checkout ---------------- */
function whatsappOrderLink(order){
  const lines = order.items.map(l => `${l.qty}x ${l.name} — ${formatRs(l.qty * l.price)}`).join('\n');
  const method = paymentMethod(order.payment_method);
  const text = encodeURIComponent(
    `Assalam o Alaikum! New website order *${order.order_no}*\n\n${lines}\n\nTotal: ${formatRs(order.total)}` +
    `${order.branch ? `\nBranch: ${order.branch}` : ''}\nName: ${order.customer_name}\nMobile: ${order.phone}\nEmail: ${order.email}` +
    `\nType: ${order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}${order.address ? `\nAddress: ${order.address}` : ''}` +
    `\nPayment: ${paymentLabel(method, order.order_type)}${order.payment_ref ? ` (TID ${order.payment_ref})` : ''}` +
    `${order.notes ? `\nNotes: ${order.notes}` : ''}`
  );
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${text}`;
}

function validateCheckout(f){
  const errors = [];
  const fail = (id, msg) => errors.push({ id, msg });
  if (f.name.length < 3 || !/^[\p{L}][\p{L} .'-]*$/u.test(f.name)) fail('ckName', 'Please enter your full name (letters only).');
  if (!normalizePkMobile(f.phone)) fail('ckPhone', 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.');
  if (!isValidEmail(f.email)) fail('ckEmail', 'Enter a valid email address, e.g. name@gmail.com.');
  if (f.order_type === 'delivery') {
    if (f.house.length < 5) fail('ckHouse', 'Please enter your house / flat number and street.');
    if (f.area.length < 2) fail('ckArea', 'Please enter your area or society.');
  }
  if (f.payment_ref && !/^[A-Za-z0-9-]{6,40}$/.test(f.payment_ref)) fail('ckPayRef', 'Transaction ID should be 6–40 letters or digits.');
  return errors;
}

async function handlePlaceOrder(e){
  e.preventDefault();
  const errorEl = document.getElementById('checkoutError');
  const form = document.getElementById('checkoutForm');
  errorEl.textContent = '';
  form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  form.querySelectorAll('.field-msg').forEach(el => el.remove());

  const f = readCheckoutForm();
  const errors = validateCheckout(f);
  if (errors.length) {
    errors.forEach(({ id, msg }) => {
      const field = document.getElementById(id)?.closest('.field');
      if (!field) return;
      field.classList.add('has-error');
      field.insertAdjacentHTML('beforeend', `<small class="field-msg">${msg}</small>`);
    });
    errorEl.textContent = errors.length === 1 ? errors[0].msg : 'Please fix the highlighted fields.';
    const first = document.getElementById(errors[0].id);
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: 'center', behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    return;
  }

  const subtotal = cartSubtotal();
  if (subtotal < MINIMUM_ORDER_AMOUNT) { errorEl.textContent = `Minimum order is ${formatRs(MINIMUM_ORDER_AMOUNT)}.`; return; }
  const branch = currentBranch();
  if (!branch.online) { errorEl.textContent = `Online ordering at ${branch.name} is coming soon — please call to order.`; return; }

  const phone = normalizePkMobile(f.phone);
  const city = CONFIG.DELIVERY_CITY || 'Lahore';
  const address = f.order_type === 'delivery'
    ? `${f.house}, ${f.area}, ${city}${f.landmark ? ` (near ${f.landmark})` : ''}`
    : '';
  const fee = deliveryFee(f.order_type);
  const total = subtotal + fee;
  const id = makeUuid();
  const order_no = makeOrderNo();
  const orderSummary = {
    id, order_no, customer_name: f.name.replace(/\s+/g, ' '), phone, email: f.email.toLowerCase(),
    order_type: f.order_type, address, notes: f.notes, payment_method: f.payment, payment_ref: f.payment_ref,
    delivery_fee: fee, total, branch: branch.name, items: cart.map(l => ({ ...l }))
  };

  const placeBtn = document.getElementById('placeOrderBtn');
  placeBtn.disabled = true;
  placeBtn.classList.add('is-loading');
  placeBtn.textContent = 'Placing order…';

  const client = getSupabaseClient();
  try {
    if (client) {
      // The id is generated here and the insert has no .select(): customers
      // may INSERT orders but only admins may SELECT them (RLS), so reading
      // the new row back would fail.
      const { error } = await client.from('orders').insert({
        id, order_no, customer_name: orderSummary.customer_name, phone, email: orderSummary.email,
        order_type: f.order_type, address: address || null, notes: f.notes || null,
        payment_method: f.payment, payment_ref: f.payment_ref || null,
        total, branch: branch.name, status: 'pending'
      });
      if (error) throw error;

      const itemRows = cart.map(l => ({ order_id: id, menu_item_id: String(l.id).startsWith('demo-') ? null : l.id, name: l.name, price: l.price, quantity: l.qty }));
      const { error: itemsError } = await client.from('order_items').insert(itemRows);
      if (itemsError) throw itemsError;
    } else {
      const demoOrders = JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) || '[]');
      demoOrders.push({ ...orderSummary, created_at: new Date().toISOString(), status: 'pending' });
      localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(demoOrders));
    }

    if (f.remember) saveCustomer({ name: f.name, phone, email: f.email, order_type: f.order_type, house: f.house, area: f.area, landmark: f.landmark, payment: f.payment });
    else forgetCustomer();

    lastOrderSummary = orderSummary;
    checkoutDraft = null;
    cart = [];
    saveCart();
    cartView = 'success';
    renderCart();
    document.getElementById('cartBody').scrollTop = 0;
  } catch (err) {
    console.error('[order] failed', err);
    errorEl.innerHTML = `Something went wrong placing your order. Please try again, or call us on <a href="tel:+${CONFIG.WHATSAPP_NUMBER}">${escapeHtml(CONFIG.PHONE_DELIVERY || CONFIG.WHATSAPP_NUMBER)}</a>.`;
    placeBtn.disabled = false;
    placeBtn.classList.remove('is-loading');
    placeBtn.textContent = `Place Order · ${formatRs(total)}`;
  }
}

/* ---------------- wire-up ---------------- */
function initCartControls(){
  document.getElementById('cartFab').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', closeCart);
  document.getElementById('navOrderBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (cart.length) openCart(); else scrollToHash('#menu');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('cartDrawer').classList.contains('is-open') && document.getElementById('itemModal').hidden) closeCart();
  });
  document.getElementById('cartFab').addEventListener('animationend', (e) => e.currentTarget.classList.remove('is-bumping'));
  renderCart();
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  initHeader();
  initCartControls();
  initItemModal();
  initAnchorLinks();
  if (!REDUCED_MOTION && typeof gsap !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  initSmoothScroll();
  // Pin the hero before the async menu load, so its spacer exists before
  // anything below it is measured.
  initHero();
  await initMenu();
  initScrollAnimations();
  refreshScroll();
  // The browser jumped to any #hash before the pin spacer existed; redo it.
  if (location.hash) scrollToHash(location.hash, 'auto');
});

window.addEventListener('load', refreshScroll);
