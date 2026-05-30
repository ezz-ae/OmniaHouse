// Lightweight Arabic-ratio language detector for inbound WhatsApp text.
// Per the persistence spec (Open Q3, accepted default):
//   • count Arabic block (U+0600–U+06FF) chars vs total non-space chars
//   • ≥30% Arabic → 'ar', else 'en'
//   • only ≥4-word messages cause an existing conversation to flip
//     language; shorter messages keep the conversation's current value

const ARABIC_BLOCK = /[؀-ۿ]/;

export type DetectedLanguage = 'en' | 'ar';

export function detectLanguage(body: string | null | undefined): DetectedLanguage {
  if (!body) return 'en';
  let arabic = 0;
  let total = 0;
  for (const ch of body) {
    if (/\s/.test(ch)) continue;
    total += 1;
    if (ARABIC_BLOCK.test(ch)) arabic += 1;
  }
  if (total === 0) return 'en';
  return arabic / total >= 0.3 ? 'ar' : 'en';
}

export function isMeaningfulForLanguageFlip(body: string | null | undefined): boolean {
  if (!body) return false;
  return body.trim().split(/\s+/).filter(Boolean).length >= 4;
}

// Mask a phone for stdout logging: keep the country code (last char of the
// prefix) and the last three digits, replace the middle with dots.
// Examples: +971501234884 → +971•••884   +966507733091 → +966•••091
export function maskPhone(phone: string): string {
  if (!phone) return 'unknown';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 7) return cleaned;
  const head = cleaned.startsWith('+') ? cleaned.slice(0, 4) : cleaned.slice(0, 3);
  const tail = cleaned.slice(-3);
  return `${head}•••${tail}`;
}
