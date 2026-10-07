/* =========================================================
   ALL SITE CONFIGURATION LIVES HERE.
   This is the only file you need to edit to connect a real database.
   Loaded first, before every other script, on every page.

   Leave SUPABASE_URL / SUPABASE_ANON_KEY blank and the site runs in
   demo mode: the menu falls back to js/menu-data.js and orders are
   saved to localStorage instead of a real database — nothing breaks,
   you just won't see orders land anywhere shared. Fill these in once
   you've run supabase/schema.sql on a Supabase project (see README.md).
========================================================= */

const CONFIG = {
  // From your Supabase project → Settings → API.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Used for the "Confirm on WhatsApp" link after checkout, and the
  // "Order" tel: link in the header/hero/footer. This is the delivery/
  // orders number from the Instagram bio (0347 4001410).
  WHATSAPP_NUMBER: '923474001410', // digits only, with country code, no '+'
  PHONE_DELIVERY: '0347 4001410',  // display format — delivery / orders
  PHONE_RESTAURANT: '0333 2941947', // display format — restaurant line

  // Branches customers pick from above the menu. The site's menu is the
  // "Menu DHA" price list, so only DHA Phase 4 takes online orders. The
  // others show the same menu with a "Call to order" button, so nobody is
  // charged DHA prices at a branch whose prices may differ. When a branch's
  // prices are confirmed to match, set its `online` to true. `phone`
  // (digits with country code) is the number its call buttons dial;
  // without one they dial WHATSAPP_NUMBER.
  BRANCHES: [
    { id: 'dha-phase-4',   name: 'DHA Phase 4',   online: true },
    { id: 'lakshmi-chowk', name: 'Lakshmi Chowk', tag: 'Flagship', online: false },
    { id: 'batapur',       name: 'Batapur',       online: false },
    { id: 'shalimar',      name: 'Shalimar',      online: false },
    { id: 'shadbagh',      name: 'Shadbagh',      online: false }
  ],

  // Delivery is Lahore-only (free, Rs 299 minimum — see menu-data.js).
  DELIVERY_CITY: 'Lahore',
  DELIVERY_FEE: 0,

  // Payment methods offered at checkout, in display order. `enabled: false`
  // hides one. For the wallets / bank transfer, fill in the account the
  // customer should pay into: until `account` is filled, checkout tells the
  // customer the details will be sent on WhatsApp when the order is
  // confirmed, and doesn't ask for a transaction ID.
  PAYMENT_METHODS: [
    { id: 'cod',       label: 'Cash on Delivery', pickupLabel: 'Pay at Counter', note: 'Pay in cash when your order arrives.', pickupNote: 'Pay in cash or card when you collect.', enabled: true },
    { id: 'jazzcash',  label: 'JazzCash',  note: 'Mobile wallet transfer.', enabled: true, accountTitle: '', account: '' },
    { id: 'easypaisa', label: 'Easypaisa', note: 'Mobile wallet transfer.', enabled: true, accountTitle: '', account: '' },
    { id: 'bank',      label: 'Bank Transfer', note: 'IBFT / Raast to our bank account.', enabled: true, bankName: '', accountTitle: '', account: '' }
  ]
};
