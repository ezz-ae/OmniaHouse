export type DraftOrder = {
  id: string;
  number: string;
  customer: { name: string; phone: string };
  store: 'shopify' | 'woocommerce' | 'whatsapp';
  items: number;
  total_aed: number;
  status: 'draft' | 'invoice_sent' | 'paid' | 'shipped' | 'completed' | 'flagged' | 'refund_pending';
  created_at: string;
  flags?: string[];
  agent?: string;
};

export function getDraftOrders(): DraftOrder[] {
  return [
    { id: 'o1', number: '#1287', customer: { name: 'Aisha M.', phone: '+971501234884' }, store: 'whatsapp', items: 2, total_aed: 2_600, status: 'draft', created_at: '14:33', agent: 'Layla' },
    { id: 'o2', number: '#1286', customer: { name: 'Noura A.', phone: '+971555478217' }, store: 'whatsapp', items: 1, total_aed: 1_850, status: 'invoice_sent', created_at: '14:18', agent: 'Omar' },
    { id: 'o3', number: '#1285', customer: { name: 'Mariam K.', phone: '+971507733091' }, store: 'whatsapp', items: 3, total_aed: 5_400, status: 'flagged', created_at: '13:51', flags: ['ring_no_size'], agent: 'Layla' },
    { id: 'o4', number: '#1284', customer: { name: 'Reem H.', phone: '+971566201155' }, store: 'shopify', items: 1, total_aed: 12_400, status: 'completed', created_at: '13:18', agent: 'Omar' },
    { id: 'o5', number: '#1283', customer: { name: 'Layla S.', phone: '+971508811276' }, store: 'woocommerce', items: 4, total_aed: 8_900, status: 'paid', created_at: '12:44' },
    { id: 'o6', number: '#1282', customer: { name: 'Khalid R.', phone: '+971505590033' }, store: 'shopify', items: 2, total_aed: 4_200, status: 'shipped', created_at: '11:20' },
    { id: 'o7', number: '#1281', customer: { name: 'Sara A.', phone: '+971559911228' }, store: 'whatsapp', items: 1, total_aed: 3_400, status: 'flagged', created_at: '10:55', flags: ['cod_high_value'], agent: 'Layla' },
    { id: 'o8', number: '#1280', customer: { name: 'Fatima O.', phone: '+971508822991' }, store: 'shopify', items: 1, total_aed: 1_300, status: 'refund_pending', created_at: '09:30', flags: ['refund_requested'] },
  ];
}
