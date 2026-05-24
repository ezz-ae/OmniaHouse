import type { Shortcut } from './types';

/**
 * Seed CRM shortcuts. Eventually loaded from crm_shortcuts table.
 * Each shortcut has bilingual content because most luxury jewellery
 * conversations need both EN and AR variants.
 */
export const SHORTCUTS: Shortcut[] = [
  {
    id: 's1',
    trigger_key: '/welcome',
    category: 'greeting',
    content_en:
      "Hello and welcome to Omnia. I'm delighted to help you today. Could I have your name, please?",
    content_ar:
      "أهلاً وسهلاً بكِ في أومنيا. يسعدني مساعدتك اليوم. ممكن أعرف اسمك الكريم؟",
  },
  {
    id: 's2',
    trigger_key: '/welcome-back',
    category: 'greeting',
    content_en:
      "Welcome back to Omnia. It's lovely to hear from you again. How can I help today?",
    content_ar:
      "أهلاً بعودتك إلى أومنيا. سعدنا بتواصلك معنا من جديد. كيف يمكنني خدمتك اليوم؟",
  },
  {
    id: 's3',
    trigger_key: '/ring-size',
    category: 'product',
    content_en:
      "To make sure the ring fits perfectly, could you share your size? If you're not sure, the easiest way is to measure the inner diameter of a ring you already wear in millimeters.",
    content_ar:
      "للتأكد من أن المقاس مناسب تماماً، ممكن تشاركينا مقاسك؟ لو ما تعرفين، أسهل طريقة هي قياس القطر الداخلي بالملم لخاتم تلبسينه حالياً.",
  },
  {
    id: 's4',
    trigger_key: '/bank-uae',
    category: 'payment',
    content_en:
      "You can transfer directly to our Emirates NBD account:\nAccount name: Omniastores LLC\nIBAN: AE••• ••• ••• •••\nPlease share the transfer screenshot here once done.",
    content_ar:
      "يمكنك التحويل مباشرة إلى حسابنا في الإمارات دبي الوطني:\nاسم الحساب: Omniastores LLC\nالآيبان: AE••• ••• ••• •••\nبعد التحويل، الرجاء إرسال صورة من إيصال التحويل.",
  },
  {
    id: 's5',
    trigger_key: '/cod',
    category: 'payment',
    content_en:
      "Cash on delivery is available. Our driver will collect payment at your door. Please have the exact amount ready if possible.",
    content_ar:
      "خدمة الدفع عند الاستلام متوفرة. سيستلم السائق المبلغ عند بابك. لو تكرمتي، يفضل تجهيز المبلغ تماماً.",
  },
  {
    id: 's6',
    trigger_key: '/tamara',
    category: 'payment',
    content_en:
      "You can split the payment into 4 with Tamara, no extra cost. Here is the secure checkout link: {{tamara_link}}",
    content_ar:
      "يمكنك تقسيط المبلغ على 4 دفعات مع تمارا، بدون أي رسوم إضافية. هذا رابط الدفع الآمن: {{tamara_link}}",
  },
  {
    id: 's7',
    trigger_key: '/tabby',
    category: 'payment',
    content_en:
      "Pay in 4 installments with Tabby, no interest. Here is your secure checkout: {{tabby_link}}",
    content_ar:
      "ادفعي على 4 أقساط مع تابي، بدون فوائد. رابط الدفع: {{tabby_link}}",
  },
  {
    id: 's8',
    trigger_key: '/dxb-24h',
    category: 'shipping',
    content_en:
      "Delivery within Dubai is same-day or next-day, depending on the time of order confirmation. We'll send you tracking once dispatched.",
    content_ar:
      "التوصيل داخل دبي خلال 24 ساعة أو في نفس اليوم حسب وقت تأكيد الطلب. سنرسل لك تفاصيل الشحنة عند الإرسال.",
  },
  {
    id: 's9',
    trigger_key: '/ksa-shipping',
    category: 'shipping',
    content_en:
      "Shipping to Saudi Arabia takes 2-4 working days. Tracking is shared the moment we dispatch. Customs are pre-paid by us.",
    content_ar:
      "الشحن إلى المملكة العربية السعودية يستغرق من 2 إلى 4 أيام عمل. سنشارك معك رقم الشحنة فور الإرسال. الجمارك مدفوعة مسبقاً.",
  },
  {
    id: 's10',
    trigger_key: '/gift-wrap',
    category: 'shipping',
    content_en:
      "Yes, complimentary luxury gift wrapping is included. Would you like to add a handwritten note?",
    content_ar:
      "نعم، التغليف الفاخر مجاني. هل ترغبين بإضافة بطاقة مكتوبة بخط اليد؟",
  },
  {
    id: 's11',
    trigger_key: '/le-cashback',
    category: 'closing',
    content_en:
      "Your purchase earns 5% cashback ({{amount}} AED) that you can use on our Limited Editions collection. The credit is added the moment your order completes.",
    content_ar:
      "يكسبك طلبك 5% كاش باك ({{amount}} درهم) للاستخدام على مجموعة الإصدارات المحدودة. يضاف الرصيد فور اكتمال الطلب.",
  },
  {
    id: 's12',
    trigger_key: '/thanks',
    category: 'closing',
    content_en:
      "Thank you for trusting Omnia. We can't wait for you to wear it.",
    content_ar:
      "شكراً لاختياركم أومنيا. لا نطيق صبراً لتلبسوها.",
  },
  {
    id: 's13',
    trigger_key: '/price-question',
    category: 'objection',
    content_en:
      "Each piece is hand-finished in Dubai and certified. The price reflects the quality of materials and the craftsmanship. Would you like to see something within a specific range?",
    content_ar:
      "كل قطعة مصنوعة يدوياً في دبي ومعتمدة. السعر يعكس جودة الخامات والصنعة. هل تفضلين أن أقترح قطعة ضمن ميزانية معينة؟",
  },
];

const TRIGGER_RE = /(\/[a-z0-9_-]+)/g;

/**
 * Expand /shortcuts found in the agent's text into their EN/AR content.
 * Returns the original text, the expanded text, and which shortcuts hit.
 */
export function expandShortcuts(
  text: string,
  language: 'en' | 'ar' = 'en',
  vars: Record<string, string> = {},
): { expanded: string; hits: Shortcut[] } {
  if (!text) return { expanded: text, hits: [] };
  const hits: Shortcut[] = [];
  const expanded = text.replace(TRIGGER_RE, (match) => {
    const sc = SHORTCUTS.find((s) => s.trigger_key === match);
    if (!sc) return match;
    hits.push(sc);
    let body = language === 'ar' ? sc.content_ar : sc.content_en;
    for (const [k, v] of Object.entries(vars)) {
      body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    return body;
  });
  return { expanded, hits };
}

export function searchShortcuts(q: string): Shortcut[] {
  if (!q) return SHORTCUTS.slice(0, 8);
  const n = q.toLowerCase();
  return SHORTCUTS.filter(
    (s) =>
      s.trigger_key.includes(n) ||
      s.content_en.toLowerCase().includes(n) ||
      s.category.includes(n),
  );
}
