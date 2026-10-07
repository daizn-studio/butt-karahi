/* =========================================================
   DEMO MENU DATA — Butt Karahi "Menu DHA" (posted 31 Dec 2024 on
   Butt Karahi's own Instagram story, supplied by the client).
   Used only when CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY are blank.
   Once the database is connected, supabase/schema.sql's copy of this
   same menu takes over (regenerate it with `node supabase/build-menu-sql.js`
   after editing this file).

   Sections and their order follow the printed menu exactly. Items the
   printed menu lists in two sections (Cheese Naan, Qeema Naans, Russian
   and Pineapple Salad appear under both Appetizers and Tandoor / Salads)
   are listed in both here too, as separate entries.

   `options` holds real sizes / variants from the printed menu
   (Half | Full, 0.5 Kg | 1 Kg, 200g | 400g, with Butter, …) as
   [{ label, price }]. `price` is then the first option's price. Items
   with a single price have options: null.

   Photos: an item's `image` is one of Butt Karahi's own foodpanda
   listing photos (images.deliveryhero.io). Every other item uses
   images/menu/<slug>.jpg — Creative Commons stock photos of the same
   dish (not Butt Karahi's own food), credited in images/menu/credits.json
   and CREDITS.md. Swap any of those files for a real photo of the dish
   under the same name, no code change needed.
========================================================= */

// Bump when the menu below changes: the admin dashboard's demo-mode copy
// (localStorage) is reseeded from this file whenever the version differs.
const MENU_VERSION = 'dha-2024-12-31-names';

const MENU_IMG_BASE = 'https://images.deliveryhero.io/image/fd-pk/';

const MENU_SECTIONS = [
  ['Appetizers', [
    { name: 'Mutton Yakhni', price: 500 },
    { name: 'Cheese Naan', price: 650 },
    { name: 'Mutton Qeema Naan', price: 1550 },
    { name: 'Chicken/Beef Qeema Naan', options: [['Chicken', 1050], ['Beef', 1050]] },
    { name: 'Russian Salad', price: 700 },
    { name: 'Pineapple Salad', price: 850 },
    { name: 'Finger Fish', description: '5 pcs, with tartar sauce.', price: 2445 }
  ]],
  ['Karahi', [
    { name: 'Chicken Karahi', options: [['Regular', 2600], ['With Butter', 2950]], popular: true, image: 'products/33864124.jpg' },
    { name: 'Desi Murgh Karahi', options: [['Regular', 5000], ['With Butter', 5500]], popular: true },
    { name: 'Mutton Karahi', options: [['Regular', 5000], ['With Butter', 5500]], popular: true }
  ]],
  ['BBQ', [
    { name: 'Butt Special Mix Platter', description: 'Serves 2–4. 4 Malai Boti, 4 Chicken Boti, 4 Kastoori Boti, 4 Mutton Chops, 2 Chicken Kebab, 2 Reshmi Kebab.', price: 5350, popular: true },
    { name: 'Butt Special Kebab', description: '1 meter kebab.', price: 2200, popular: true },
    { name: 'Mutton Kebab', description: '4 pcs.', price: 2100 },
    { name: 'Mutton Chops', description: '6 pcs.', price: 3800 },
    { name: 'Gandari Kebab', description: '4 pcs.', price: 1490 },
    { name: 'Chicken Kebab', description: '4 pcs.', price: 1290 },
    { name: 'Chicken Kastoori Kebab', description: '4 pcs.', price: 2200 },
    { name: 'Beef Kebab', description: '4 pcs.', price: 1290 },
    { name: 'Beef Behari Kebab', price: 1900 },
    { name: 'Reshmi Kebab', description: '4 pcs.', price: 1550 },
    { name: 'Chicken Malai Gola Kebab', description: '5 pcs.', price: 1800 },
    { name: 'Chicken Afghani Kebab', description: '8 pcs.', price: 2000 },
    { name: 'Chicken Kastoori Boti', description: '10 pcs.', price: 2250 },
    { name: 'Chicken Malai Boti', description: '10 pcs.', price: 1950 },
    { name: 'Chicken Boti', description: '10 pcs.', price: 1350 },
    { name: 'Chicken Piece', price: 665 },
    { name: 'Sheesh Taouk', description: '10 pcs.', price: 1950 },
    { name: 'Grand Mix Grill Platter', description: 'Serves 6–8. 10 Malai Boti, 10 Chicken Boti, 3 Reshmi Kebab, 2 Roghni Naan, 6 Mutton Champs, 3 Chicken Kebab, 3 Beef Kebab, 4 Gola Kebab, 2 plates rice with special garnishing.', price: 10580 }
  ]],
  ['Takka Tak', [
    { name: 'Butt Special Mix Tawa', price: 3200 },
    { name: 'Mutton Champ Masala', description: '4 pcs.', price: 3200 },
    { name: 'Mutton Brain Masala', price: 2500 },
    { name: 'Mutton Qeema Tawa', price: 3200 },
    { name: 'Chicken Boneless Tawa', price: 2500 },
    { name: 'Gurda Kapura', description: '3 pcs gurda, 2 pcs kapura.', price: 2100 },
    { name: 'Special Makhni Tawa', price: 2500 },
    { name: 'Special Tawa Mirchi', price: 2100 },
    { name: 'Chicken Tawa Piece', price: 1350 },
    { name: 'Dum Qeema', price: 2050 },
    { name: 'Taxali Tawa Masala', price: 1550 }
  ]],
  ['Handi', [
    { name: 'Chicken Mughlai Handi', description: 'Full.', price: 2900 },
    { name: 'Chicken Boneless Handi', options: [['Half', 1550], ['Full', 2800]] },
    { name: 'Chicken Achari Handi', options: [['Half', 1550], ['Full', 2800]] },
    { name: 'Chicken Madrasi Handi', options: [['Half', 1550], ['Full', 2800]] },
    { name: 'Chicken Hyderabadi Handi', options: [['Half', 1500], ['Full', 2800]] },
    { name: 'Mutton Boneless Handi', options: [['Half', 3000], ['Full', 5600]] },
    { name: 'Chicken Patiala Handi', options: [['Half', 1550], ['Full', 2900]] }
  ]],
  ['Pakistani Cuisine', [
    { name: 'Butter Chicken', options: [['Half', 1600], ['Full', 2900]], popular: true },
    { name: 'Palak Paneer', price: 1100 },
    { name: 'Palak Gosht', price: 2100 },
    { name: 'Chicken Jalfrezi', price: 2550 },
    { name: 'Chicken Kebab Masala', price: 2100 },
    { name: 'Mix Vegetables Makhni', price: 1000 },
    { name: 'Daal Mash Makhni', price: 1200 },
    { name: 'Bhuna Gosht', price: 6200 },
    { name: 'Chicken Boti Masala', price: 2650 }
  ]],
  ['Hareesa', [
    { name: 'Beef Hareesa Kashmiri', description: 'Seasonal. Desi ghee tarka.', options: [['Half', 1400], ['Full', 2400]] },
    { name: 'Mutton Hareesa Kashmiri', description: 'Seasonal. Desi ghee tarka.', options: [['Half', 3000], ['Full', 5500]] }
  ]],
  ['Rice', [
    { name: 'Chicken Biryani', price: 1200, popular: true },
    { name: 'Mutton Biryani', price: 1750 }
  ]],
  ['Fish', [
    { name: 'Grilled Fish', description: 'Seasonal. Kala rahu, with plum sauce.', options: [['0.5 Kg', 1500], ['1 Kg', 2800]] },
    { name: 'Fish Tikka', description: 'Seasonal.', price: 2445 }
  ]],
  ['Kids Menu', [
    { name: 'Junior Burger with French Fries', price: 1200 },
    { name: 'Chicken Nuggets with French Fries', price: 990 },
    { name: 'Regular Fries', price: 590 }
  ]],
  ['Tandoor', [
    { name: 'Qeema Naan', description: 'Chicken or beef qeema.', options: [['Chicken', 1050], ['Beef', 1050]] },
    { name: 'Mutton Qeema Naan', price: 1550 },
    { name: 'Cheese Naan', price: 650 },
    { name: 'Roghni Naan', price: 170, image: 'Products/7972087.jpg' },
    { name: 'Kalwanji Naan', price: 250, image: 'products/7972153.jpg' },
    { name: 'Garlic Naan', price: 250, popular: true, image: 'Products/7972062.jpg' },
    { name: 'Achari Naan', price: 300 },
    { name: 'Sada Naan', price: 130, image: 'Products/7972082.jpg' },
    { name: 'Tandoori Roti', price: 70, image: 'Products/51537908.jpg' },
    { name: 'Tandoori Paratha', price: 300, image: 'Products/63732165.jpg' },
    { name: 'Khamiri Roti', price: 130, image: 'Products/7972063.jpg' },
    { name: 'Badshahi Naan', price: 350 },
    { name: 'Lacha Paratha', price: 350 },
    { name: 'Puri Paratha', price: 350 }
  ]],
  ['Salads & Raita', [
    { name: 'Russian Salad', price: 700 },
    { name: 'Pineapple Salad', price: 850 },
    { name: 'Fresh Salad', price: 350, image: 'Products/7972068.jpg' },
    { name: 'Kachumar Salad', price: 450 },
    { name: 'Zeera Raita', price: 350, popular: true, image: 'Products/7972067.jpg' },
    { name: 'Plain Raita', price: 300, image: 'Products/7972069.jpg' },
    { name: 'Podina Raita', price: 350 },
    { name: 'Imli Sauce', price: 150 }
  ]],
  ['Cold Beverages', [
    { name: 'Coke Can', price: 240 },
    { name: 'Coke Zero Can', price: 240 },
    { name: 'Sprite Zero Can', price: 240 },
    { name: 'Fanta Can', price: 240 },
    { name: 'Mineral Water', options: [['Small', 150], ['Large', 250]], image: 'Products/63739755.jpg' }
  ]],
  ['Special Lassi', [
    { name: 'Butt Special Lassi', description: 'Dry fruit.', price: 695, popular: true },
    { name: 'Mango Lassi', description: 'Seasonal.', price: 595 },
    { name: 'Sweet Lassi', price: 495 },
    { name: 'Salty Lassi', price: 495 }
  ]],
  ['Coolers', [
    { name: 'Fresh Lime', price: 325 },
    { name: 'Mint Margarita', price: 595 },
    { name: 'Blueberry Delight', price: 595 },
    { name: 'Lychee Cooler', price: 595 },
    { name: 'Pina Colada', price: 595 },
    { name: 'Pink Passion', price: 595 },
    { name: 'Cucumber Mint', price: 595 },
    { name: 'Blue Lagoon', price: 595 },
    { name: 'Mint Soda', price: 595 }
  ]],
  ['Fresh Seasonal Juices', [
    { name: 'Mango Juice', price: 645 },
    { name: 'Pineapple Juice', price: 645 },
    { name: 'Peach Juice', price: 645 },
    { name: 'Falsa Juice', price: 645 }
  ]],
  ['Desserts', [
    { name: 'Ras Malai', description: '2 pcs.', price: 450 },
    { name: 'Kheer', price: 450 },
    { name: 'Gulab Jaman', description: 'Served hot, 2 pcs.', price: 450 },
    { name: 'Halwajaat', description: 'Seasonal. Gajjar, petha, daal.', options: [['200g', 600], ['400g', 1100]] }
  ]],
  ['Hot Beverages', [
    { name: 'Karak Chai', price: 350 },
    { name: 'Doodh Patti', price: 350 },
    { name: 'Qahwa Peshawari', price: 350 },
    { name: 'Green Tea', price: 350 }
  ]]
];

function menuSlug(text){ return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

let menuSortOrder = 0;
const DEMO_MENU_ITEMS = MENU_SECTIONS.flatMap(([category, items]) => items.map(item => {
  const options = item.options ? item.options.map(([label, price]) => ({ label, price })) : null;
  return {
    id: `demo-${menuSlug(category)}-${menuSlug(item.name)}`,
    name: item.name,
    description: item.description || '',
    price: options ? options[0].price : item.price,
    options,
    category,
    is_popular: !!item.popular,
    image_url: item.image ? MENU_IMG_BASE + item.image : `images/menu/${menuSlug(item.name)}.jpg`,
    is_available: true,
    sort_order: ++menuSortOrder
  };
}));

const MENU_CATEGORY_ORDER = ['Popular', ...MENU_SECTIONS.map(([category]) => category)];
const MINIMUM_ORDER_AMOUNT = 299;
