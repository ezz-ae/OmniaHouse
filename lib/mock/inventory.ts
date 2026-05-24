export type CatalogRow = {
  id: string;
  sku: string;
  master_title: string;
  display_title: string;
  category: string;
  on_shopify: boolean;
  on_woocommerce: boolean;
  shopify_price_aed: number | null;
  woocommerce_price_aed: number | null;
  price_delta_pct: number | null;
  shopify_in_stock: boolean | null;
  woocommerce_in_stock: boolean | null;
  shopify_qty: number | null;
  woocommerce_qty: number | null;
  parity_status: 'both_match' | 'both_price_drift' | 'shopify_only' | 'woocommerce_only' | 'unclassified';
  last_synced_at: string;
};

export function getCatalog(): CatalogRow[] {
  return [
    {
      id: 'c1',
      sku: 'CR-925-07',
      master_title: 'crescent ring',
      display_title: 'Crescent Ring · 925 silver',
      category: 'Rings',
      on_shopify: true,
      on_woocommerce: true,
      shopify_price_aed: 1_300,
      woocommerce_price_aed: 1_300,
      price_delta_pct: 0,
      shopify_in_stock: true,
      woocommerce_in_stock: true,
      shopify_qty: 12,
      woocommerce_qty: 8,
      parity_status: 'both_match',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c2',
      sku: 'MS-RG-01',
      master_title: 'moonstone pendant',
      display_title: 'Moonstone Pendant · rose gold',
      category: 'Necklaces',
      on_shopify: true,
      on_woocommerce: true,
      shopify_price_aed: 1_850,
      woocommerce_price_aed: 1_750,
      price_delta_pct: 5.7,
      shopify_in_stock: true,
      woocommerce_in_stock: true,
      shopify_qty: 3,
      woocommerce_qty: 6,
      parity_status: 'both_price_drift',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c3',
      sku: 'SD-BL-01',
      master_title: 'sapphire drop earrings',
      display_title: 'Sapphire Drop Earrings',
      category: 'Earrings',
      on_shopify: true,
      on_woocommerce: true,
      shopify_price_aed: 2_300,
      woocommerce_price_aed: 2_300,
      price_delta_pct: 0,
      shopify_in_stock: true,
      woocommerce_in_stock: true,
      shopify_qty: 9,
      woocommerce_qty: 4,
      parity_status: 'both_match',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c4',
      sku: 'PS-18-01',
      master_title: 'pearl strand necklace',
      display_title: 'Pearl Strand Necklace · 18"',
      category: 'Necklaces',
      on_shopify: false,
      on_woocommerce: true,
      shopify_price_aed: null,
      woocommerce_price_aed: 2_450,
      price_delta_pct: null,
      shopify_in_stock: null,
      woocommerce_in_stock: true,
      shopify_qty: null,
      woocommerce_qty: 11,
      parity_status: 'woocommerce_only',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c5',
      sku: 'ET-925-01',
      master_title: 'emerald tennis bracelet',
      display_title: 'Emerald Tennis Bracelet · 925',
      category: 'Bracelets',
      on_shopify: true,
      on_woocommerce: false,
      shopify_price_aed: 2_800,
      woocommerce_price_aed: null,
      price_delta_pct: null,
      shopify_in_stock: true,
      shopify_qty: 7,
      woocommerce_in_stock: null,
      woocommerce_qty: null,
      parity_status: 'shopify_only',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c6',
      sku: 'RB-GD-02',
      master_title: 'ruby bangle',
      display_title: 'Ruby Bangle · gold-plated',
      category: 'Bracelets',
      on_shopify: true,
      on_woocommerce: true,
      shopify_price_aed: 950,
      woocommerce_price_aed: 1_100,
      price_delta_pct: -13.6,
      shopify_in_stock: true,
      woocommerce_in_stock: false,
      shopify_qty: 14,
      woocommerce_qty: 0,
      parity_status: 'both_price_drift',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c7',
      sku: 'OE-SL-01',
      master_title: 'opal earrings',
      display_title: 'Opal Stud Earrings · silver',
      category: 'Earrings',
      on_shopify: true,
      on_woocommerce: true,
      shopify_price_aed: 740,
      woocommerce_price_aed: 720,
      price_delta_pct: 2.8,
      shopify_in_stock: false,
      woocommerce_in_stock: true,
      shopify_qty: 0,
      woocommerce_qty: 5,
      parity_status: 'both_price_drift',
      last_synced_at: '2 min ago',
    },
    {
      id: 'c8',
      sku: 'CN-GD-LE',
      master_title: 'celestial necklace limited',
      display_title: 'Celestial Necklace · LE 2026',
      category: 'Necklaces',
      on_shopify: true,
      on_woocommerce: false,
      shopify_price_aed: 4_900,
      woocommerce_price_aed: null,
      price_delta_pct: null,
      shopify_in_stock: true,
      shopify_qty: 2,
      woocommerce_in_stock: null,
      woocommerce_qty: null,
      parity_status: 'shopify_only',
      last_synced_at: '2 min ago',
    },
  ];
}

export function getParitySummary() {
  const rows = getCatalog();
  return {
    total: rows.length,
    both_match: rows.filter((r) => r.parity_status === 'both_match').length,
    both_price_drift: rows.filter((r) => r.parity_status === 'both_price_drift').length,
    shopify_only: rows.filter((r) => r.parity_status === 'shopify_only').length,
    woocommerce_only: rows.filter((r) => r.parity_status === 'woocommerce_only').length,
    low_stock:
      rows.filter(
        (r) =>
          (r.shopify_qty !== null && r.shopify_qty <= 3) ||
          (r.woocommerce_qty !== null && r.woocommerce_qty <= 3),
      ).length,
    last_run: '2 min ago',
    next_run: 'in 28 min',
  };
}
