export type WAConversation = {
  id: string;
  phone: string;
  customer_name: string | null;
  last_message: string;
  last_at: string;
  status: 'unclaimed' | 'in_progress' | 'awaiting_customer' | 'ready_for_draft';
  assignee: string | null;
  unread: number;
  language: 'en' | 'ar' | 'mixed';
  customer_history?: { orders: number; ltv_aed: number; last_at: string };
};

export function getWAConversations(): WAConversation[] {
  return [
    {
      id: 'w1',
      phone: '+971501234884',
      customer_name: 'Aisha M.',
      last_message: 'Hi, do you have the crescent ring in size 7? I want one for me and one for my sister.',
      last_at: '14:32',
      status: 'in_progress',
      assignee: 'Layla',
      unread: 0,
      language: 'en',
      customer_history: { orders: 3, ltv_aed: 14_400, last_at: '2026-04-12' },
    },
    {
      id: 'w2',
      phone: '+971552170844',
      customer_name: null,
      last_message: 'السلام عليكم، السلسلة الذهبية متوفرة؟',
      last_at: '14:30',
      status: 'unclaimed',
      assignee: null,
      unread: 1,
      language: 'ar',
    },
    {
      id: 'w3',
      phone: '+971555478217',
      customer_name: 'Noura A.',
      last_message: 'I sent the bank transfer screenshot. Can you confirm?',
      last_at: '14:27',
      status: 'awaiting_customer',
      assignee: 'Omar',
      unread: 0,
      language: 'en',
      customer_history: { orders: 7, ltv_aed: 38_200, last_at: '2026-05-19' },
    },
    {
      id: 'w4',
      phone: '+971507733091',
      customer_name: 'Mariam K.',
      last_message: 'بس لازم تخلصه قبل يوم الخميس لأني هسافر',
      last_at: '14:21',
      status: 'ready_for_draft',
      assignee: 'Layla',
      unread: 0,
      language: 'ar',
      customer_history: { orders: 1, ltv_aed: 3_400, last_at: '2026-02-08' },
    },
    {
      id: 'w5',
      phone: '+971589224401',
      customer_name: null,
      last_message: 'price for moonstone pendant in rose gold?',
      last_at: '14:18',
      status: 'unclaimed',
      assignee: null,
      unread: 2,
      language: 'en',
    },
    {
      id: 'w6',
      phone: '+971566201155',
      customer_name: 'Reem H.',
      last_message: 'will pick up tomorrow at 2pm if that works',
      last_at: '14:11',
      status: 'awaiting_customer',
      assignee: 'Omar',
      unread: 0,
      language: 'en',
      customer_history: { orders: 4, ltv_aed: 22_100, last_at: '2026-05-02' },
    },
    {
      id: 'w7',
      phone: '+971501009922',
      customer_name: null,
      last_message: 'Hello? Did you see my message from yesterday',
      last_at: '14:02',
      status: 'unclaimed',
      assignee: null,
      unread: 3,
      language: 'en',
    },
  ];
}

export const SAMPLE_CHAT = `Customer: hi! im interested in the crescent ring i saw on instagram
Customer: do you have it in 925 silver, size 7?
Customer: actually i want 2, one for me one for my sister
Agent: Hi Aisha! 👋 Yes both are in stock — 925 silver, size 7. AED 1,300 each.
Customer: ok perfect. ship to Al Wasl Road, Villa 42, Dubai. cod ok?
Customer: my number for delivery is +971 50 123 4884
Agent: Perfect, will arrange COD. Need it by when?
Customer: thursday if possible 🙏`;

export type ExtractedOrder = {
  customer: {
    name: string;
    phone: string;
    language: 'en' | 'ar' | 'mixed';
    matched_existing: boolean;
    existing_orders?: number;
    existing_ltv_aed?: number;
  };
  items: {
    sku: string;
    title: string;
    variant: string;
    qty: number;
    price_aed: number;
    confidence: number;
    matched: boolean;
  }[];
  shipping: {
    city: string;
    address: string;
    deadline: string;
    method: 'cod' | 'transfer' | 'card';
  };
  flags: {
    type: 'pii' | 'ring_no_size' | 'cod_high_value' | 'discount' | 'missing_field' | 'price_drift' | 'language';
    severity: 'info' | 'warn' | 'bad';
    note: string;
  }[];
  intent: 'order' | 'inquiry' | 'support' | 'mixed';
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
};

export function getExtractedOrder(): ExtractedOrder {
  return {
    customer: {
      name: 'Aisha M.',
      phone: '+971501234884',
      language: 'en',
      matched_existing: true,
      existing_orders: 3,
      existing_ltv_aed: 14_400,
    },
    items: [
      {
        sku: 'CR-925-07',
        title: 'Crescent Ring',
        variant: '925 silver · size 7',
        qty: 2,
        price_aed: 1_300,
        confidence: 0.97,
        matched: true,
      },
    ],
    shipping: {
      city: 'Dubai',
      address: 'Al Wasl Road, Villa 42',
      deadline: '2026-05-28',
      method: 'cod',
    },
    flags: [
      {
        type: 'pii',
        severity: 'info',
        note: 'Phone normalized to +971501234884 (E.164). Address masked in logs.',
      },
      {
        type: 'cod_high_value',
        severity: 'info',
        note: 'COD AED 2,600 — under AED 3,000 threshold. No flag required.',
      },
    ],
    intent: 'order',
    totals: { subtotal: 2_600, shipping: 0, total: 2_600 },
  };
}
