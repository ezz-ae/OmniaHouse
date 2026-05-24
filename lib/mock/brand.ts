export type GASnapshot = {
  sessions_today: number;
  bounce_rate: number;
  avg_session_duration_sec: number;
  conversion_rate_pct: number;
  top_pages: { path: string; sessions: number; bounce_rate: number }[];
  channels: { channel: string; sessions: number; share_pct: number }[];
};

export function getGASnapshot(): GASnapshot {
  return {
    sessions_today: 2_847,
    bounce_rate: 41.2,
    avg_session_duration_sec: 184,
    conversion_rate_pct: 2.8,
    top_pages: [
      { path: '/products/crescent-ring', sessions: 412, bounce_rate: 28.4 },
      { path: '/products/moonstone-pendant', sessions: 287, bounce_rate: 31.1 },
      { path: '/', sessions: 619, bounce_rate: 38.9 },
      { path: '/collections/limited-editions', sessions: 188, bounce_rate: 22.7 },
      { path: '/products/sapphire-drop-earrings', sessions: 145, bounce_rate: 35.2 },
    ],
    channels: [
      { channel: 'Instagram', sessions: 1_122, share_pct: 39.4 },
      { channel: 'Direct', sessions: 612, share_pct: 21.5 },
      { channel: 'Google Search', sessions: 488, share_pct: 17.1 },
      { channel: 'WhatsApp click-through', sessions: 311, share_pct: 10.9 },
      { channel: 'Email', sessions: 198, share_pct: 7.0 },
      { channel: 'Other', sessions: 116, share_pct: 4.1 },
    ],
  };
}

export type MetaSignal = {
  campaign: string;
  spend_today: number;
  roas: number;
  ctr_pct: number;
  status: 'good' | 'warn' | 'bad';
  note?: string;
};

export function getMetaSignals(): MetaSignal[] {
  return [
    { campaign: 'LE Celestial · Lookalike 1%', spend_today: 1_240, roas: 4.8, ctr_pct: 2.1, status: 'good' },
    { campaign: 'Crescent Ring · Retargeting', spend_today: 680, roas: 6.2, ctr_pct: 3.4, status: 'good' },
    { campaign: 'Brand Awareness · Reels', spend_today: 920, roas: 1.4, ctr_pct: 1.1, status: 'warn', note: 'ROAS dropping 3 days running' },
    { campaign: 'Eid Teaser · Broad', spend_today: 450, roas: 0.8, ctr_pct: 0.7, status: 'bad', note: 'Pause recommended' },
  ];
}

export type GhostPoint = {
  product: string;
  sku: string;
  cart_adds_no_checkout: number;
  value_lost_aed: number;
  trend_7d: 'up' | 'down' | 'flat';
};

export function getGhostHeatmap(): GhostPoint[] {
  return [
    { product: 'Crescent Ring', sku: 'CR-925-07', cart_adds_no_checkout: 84, value_lost_aed: 109_200, trend_7d: 'up' },
    { product: 'Moonstone Pendant', sku: 'MS-RG-01', cart_adds_no_checkout: 41, value_lost_aed: 75_850, trend_7d: 'flat' },
    { product: 'Celestial Necklace LE', sku: 'CN-GD-LE', cart_adds_no_checkout: 28, value_lost_aed: 137_200, trend_7d: 'up' },
    { product: 'Sapphire Drop Earrings', sku: 'SD-BL-01', cart_adds_no_checkout: 22, value_lost_aed: 50_600, trend_7d: 'down' },
    { product: 'Ruby Bangle', sku: 'RB-GD-02', cart_adds_no_checkout: 19, value_lost_aed: 20_900, trend_7d: 'flat' },
  ];
}
