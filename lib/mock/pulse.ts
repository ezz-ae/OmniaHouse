export type Pulse = {
  revenue_today: number;
  revenue_delta_pct: number;
  whatsapp_queue: number;
  draft_orders: number;
  parity_drift: number;
  low_stock: number;
  revenue_7d: number;
  revenue_7d_delta_pct: number;
  updated_at: string;
};

export function getPulse(): Pulse {
  return {
    revenue_today: 87_420,
    revenue_delta_pct: 12.4,
    whatsapp_queue: 7,
    draft_orders: 14,
    parity_drift: 3,
    low_stock: 8,
    revenue_7d: 642_180,
    revenue_7d_delta_pct: 8.2,
    updated_at: '2 sec',
  };
}

export type RevenueSplit = {
  store: 'omniastores.ae' | 'omniastores.com' | 'WhatsApp';
  today: number;
  mtd: number;
  share_pct: number;
};

export function getRevenueSplit(): RevenueSplit[] {
  return [
    { store: 'omniastores.ae', today: 38_240, mtd: 1_142_500, share_pct: 38.1 },
    { store: 'omniastores.com', today: 18_900, mtd: 803_220, share_pct: 26.8 },
    { store: 'WhatsApp', today: 30_280, mtd: 1_052_600, share_pct: 35.1 },
  ];
}

export type RecentActivity = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  tone?: 'good' | 'warn' | 'bad' | 'gold' | 'info';
};

export function getRecentActivity(): RecentActivity[] {
  return [
    { id: 'a1', at: '14:32', actor: 'Abdelrahman', action: 'extracted chat → draft', target: '#WA-4421', tone: 'gold' },
    { id: 'a2', at: '14:21', actor: 'System', action: 'parity drift detected', target: 'Crescent Ring 925', tone: 'bad' },
    { id: 'a3', at: '14:18', actor: 'Arslan', action: 'completed draft', target: '#1284 · AED 12,400', tone: 'good' },
    { id: 'a4', at: '14:02', actor: 'Ez', action: 'approved access for', target: 'Mohamed (Agent)', tone: 'info' },
    { id: 'a5', at: '13:51', actor: 'Hex', action: 'inventory parity refreshed', target: '847 SKUs scanned' },
    { id: 'a6', at: '13:44', actor: 'Abdelrahman', action: 'flagged customer', target: '+971 50••• 884 (repeat refunds)', tone: 'warn' },
    { id: 'a7', at: '13:30', actor: 'Arslan', action: 'replied on WhatsApp', target: '+971 55••• 217' },
    { id: 'a8', at: '13:12', actor: 'System', action: 'low stock alert', target: 'Moonstone Pendant (3 left .ae)', tone: 'warn' },
  ];
}

export type TopProduct = {
  id: string;
  title: string;
  variant?: string;
  sku: string;
  units_today: number;
  revenue_today: number;
  store: 'shopify' | 'woocommerce' | 'both';
};

export function getTopProducts(): TopProduct[] {
  return [
    { id: 'p1', title: 'Crescent Ring', variant: '925 silver · size 7', sku: 'CR-925-07', units_today: 11, revenue_today: 14_300, store: 'both' },
    { id: 'p2', title: 'Moonstone Pendant', variant: 'rose gold', sku: 'MS-RG-01', units_today: 7, revenue_today: 12_950, store: 'shopify' },
    { id: 'p3', title: 'Sapphire Drop Earrings', sku: 'SD-BL-01', units_today: 5, revenue_today: 11_500, store: 'both' },
    { id: 'p4', title: 'Pearl Strand Necklace', variant: '18 inch', sku: 'PS-18-01', units_today: 4, revenue_today: 9_800, store: 'woocommerce' },
    { id: 'p5', title: 'Emerald Tennis Bracelet', sku: 'ET-925-01', units_today: 3, revenue_today: 8_400, store: 'shopify' },
  ];
}
