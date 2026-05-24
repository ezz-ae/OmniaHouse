export type WalletEntry = {
  id: string;
  customer: string;
  phone: string;
  balance_aed: number;
  earned_30d_aed: number;
  spent_30d_aed: number;
  last_activity: string;
};

export function getWallets(): WalletEntry[] {
  return [
    { id: 'w1', customer: 'Layla S.', phone: '+971508811276', balance_aed: 800, earned_30d_aed: 420, spent_30d_aed: 0, last_activity: '2026-05-23' },
    { id: 'w2', customer: 'Noura A.', phone: '+971555478217', balance_aed: 420, earned_30d_aed: 180, spent_30d_aed: 200, last_activity: '2026-05-19' },
    { id: 'w3', customer: 'Khalid R.', phone: '+971505590033', balance_aed: 320, earned_30d_aed: 320, spent_30d_aed: 0, last_activity: '2026-05-21' },
    { id: 'w4', customer: 'Reem H.', phone: '+971566201155', balance_aed: 180, earned_30d_aed: 110, spent_30d_aed: 50, last_activity: '2026-05-02' },
  ];
}

export type LimitedEdition = {
  id: string;
  name: string;
  total_units: number;
  remaining: number;
  price_aed: number;
  launched_at: string;
  status: 'live' | 'coming_soon' | 'sold_out' | 'archived';
};

export function getLimitedEditions(): LimitedEdition[] {
  return [
    { id: 'le1', name: 'Celestial Necklace 2026', total_units: 50, remaining: 2, price_aed: 4_900, launched_at: '2026-03-15', status: 'live' },
    { id: 'le2', name: 'Sapphire Drop · Eid Edition', total_units: 100, remaining: 100, price_aed: 2_800, launched_at: '2026-06-01', status: 'coming_soon' },
    { id: 'le3', name: 'Diamond Crescent · Founder Series', total_units: 12, remaining: 0, price_aed: 18_400, launched_at: '2025-12-01', status: 'sold_out' },
  ];
}
