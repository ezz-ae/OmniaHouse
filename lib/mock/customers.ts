export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  ltv_aed: number;
  orders: number;
  last_at: string;
  stores: ('shopify' | 'woocommerce' | 'whatsapp')[];
  segment: 'vip' | 'repeat' | 'new' | 'at_risk';
  wallet_balance_aed: number;
};

export function getCustomers(): Customer[] {
  return [
    { id: 'cu1', name: 'Noura A.', phone: '+971555478217', email: 'noura@example.ae', city: 'Dubai', ltv_aed: 38_200, orders: 7, last_at: '2026-05-19', stores: ['shopify', 'whatsapp'], segment: 'vip', wallet_balance_aed: 420 },
    { id: 'cu2', name: 'Reem H.', phone: '+971566201155', city: 'Abu Dhabi', ltv_aed: 22_100, orders: 4, last_at: '2026-05-02', stores: ['shopify', 'whatsapp'], segment: 'repeat', wallet_balance_aed: 180 },
    { id: 'cu3', name: 'Aisha M.', phone: '+971501234884', city: 'Dubai', ltv_aed: 14_400, orders: 3, last_at: '2026-04-12', stores: ['whatsapp', 'woocommerce'], segment: 'repeat', wallet_balance_aed: 0 },
    { id: 'cu4', name: 'Mariam K.', phone: '+971507733091', city: 'Sharjah', ltv_aed: 3_400, orders: 1, last_at: '2026-02-08', stores: ['whatsapp'], segment: 'at_risk', wallet_balance_aed: 0 },
    { id: 'cu5', name: 'Khalid R.', phone: '+971505590033', email: 'khalid@example.com', city: 'Dubai', ltv_aed: 19_800, orders: 6, last_at: '2026-05-21', stores: ['shopify'], segment: 'repeat', wallet_balance_aed: 320 },
    { id: 'cu6', name: 'Sara A.', phone: '+971559911228', city: 'Dubai', ltv_aed: 8_900, orders: 2, last_at: '2026-05-23', stores: ['whatsapp'], segment: 'new', wallet_balance_aed: 0 },
    { id: 'cu7', name: 'Layla S.', phone: '+971508811276', city: 'Dubai', ltv_aed: 41_200, orders: 9, last_at: '2026-05-23', stores: ['woocommerce', 'whatsapp'], segment: 'vip', wallet_balance_aed: 800 },
    { id: 'cu8', name: 'Fatima O.', phone: '+971508822991', city: 'Riyadh', ltv_aed: 5_100, orders: 2, last_at: '2026-04-30', stores: ['shopify'], segment: 'at_risk', wallet_balance_aed: 0 },
  ];
}
