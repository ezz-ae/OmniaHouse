import { NextResponse } from 'next/server';
import { PROMPT_REGISTRY } from '@/lib/prompts';
import { isAIEnabled } from '@/lib/ai/client';

/**
 * GET /api/diagnostics
 *
 * Reports what the platform is wired to and what is in mock mode. Used
 * by Settings and by the deploy runbook to verify a freshly connected
 * environment.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ai_enabled: isAIEnabled(),
    supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    prompt_registry: PROMPT_REGISTRY,
    prompts_wired: PROMPT_REGISTRY.length,
    routes: {
      whatsapp: [
        'POST /api/whatsapp/extract',
        'POST /api/whatsapp/optimize-reply',
        'POST /api/whatsapp/verify-payment',
        'POST /api/whatsapp/magazine',
        'POST /api/whatsapp/save-draft',
        'POST /api/whatsapp/shortcuts',
      ],
      inventory: [
        'GET  /api/inventory/parity',
        'POST /api/inventory/live',
        'POST /api/inventory/strategy',
        'POST /api/inventory/seo-optimize',
        'POST /api/inventory/veo-prompt',
      ],
      drive: ['POST /api/drive/intelligence', 'POST /api/drive/invoice-compare'],
      brand: [
        'POST /api/brand/behavioral',
        'POST /api/brand/meta-sentinel',
        'POST /api/brand/meta-sentiment',
      ],
      omnia: ['POST /api/omnia/converse'],
      meeting: ['POST /api/meeting/analyze'],
      backyard: ['POST /api/backyard/event-decision', 'POST /api/backyard/milestone'],
    },
  });
}
