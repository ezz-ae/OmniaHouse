import type { Product, VeoResult } from './types';

/**
 * Mock VEO_CONTENT_INTELLIGENCE_PROMPT.
 * Returns cinematic video prompt + creative brief tailored to House of Omnia's
 * brand voice (luxury Middle East, sand-tone palette, hand-finishing focus).
 */
export function runVeo(p: Product): VeoResult {
  const goldenHourCues: Record<string, string> = {
    'silver': 'cool moonlight on dunes',
    '925 silver': 'cool moonlight on dunes',
    'rose gold': 'amber Dubai golden hour',
    '18k gold': 'low Gulf sunset, warm halo',
    'gold-plated': 'soft tungsten light',
    'pearl': 'overcast Marina morning',
    '18k gold + diamond': 'spotlit black marble',
    'platinum-tone': 'foggy blue hour',
  };

  const lighting = goldenHourCues[p.material] || 'controlled studio softbox';
  const isLE = p.is_limited_edition;
  const story = isLE ? 'unrepeated, numbered, the last of its kind' : 'made by hand in Dubai';

  const video_prompt = [
    `Macro pan across ${p.display_title} (${p.material}).`,
    `Opening: ${lighting} hits the metal at a 15° angle, revealing the ${p.material} texture.`,
    `Beat 1: slow rotation, depth-of-field shifts to the brand mark.`,
    `Beat 2: a woman's hand, henna-darkened nails, lifts the piece into frame.`,
    `Beat 3: cut to close on the certificate ${isLE ? 'with the edition number' : 'with the maker stamp'}.`,
    `Closing card: "Omnia. ${story}."`,
    'Duration: 8 seconds. Aspect: 9:16 for Reels + Shorts.',
  ].join(' ');

  const creative_brief = [
    `Audience: GCC luxury jewellery buyers, ages 28-48, primarily Dubai/Abu Dhabi/Riyadh.`,
    `Tone: precise, quiet, certain. No music drop. No fast cuts.`,
    `Brand voice: "${story}." Avoid words: "stunning", "wow", "must-have".`,
    `Distribution: Instagram Reels (primary), TikTok (secondary), Shopify product page hero.`,
    isLE
      ? 'Position as scarcity object — show edition number prominently. Don\'t mention price.'
      : 'Position as everyday luxury — show wearable context. Price visible in description, not on-screen.',
  ].join(' ');

  const music_mood = isLE
    ? 'Oud + sub-bass drone. No melody. Builds 0.5dB per second to the certificate beat.'
    : 'Ambient piano with strings. Minor key. Restrained. No drum.';

  const seo_video_tags = [
    p.master_title,
    p.material,
    p.category.toLowerCase(),
    'Omnia Dubai',
    'GCC luxury jewellery',
    isLE ? 'limited edition Dubai' : 'handcrafted jewellery',
    'Middle East bridal',
  ];

  return { video_prompt, creative_brief, music_mood, seo_video_tags };
}
