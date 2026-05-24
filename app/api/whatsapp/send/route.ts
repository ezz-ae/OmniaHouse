import { NextResponse } from 'next/server';
import { sendText, sendTemplate, isCloudConfigured } from '@/lib/whatsapp/cloud/client';
import type { WACloudTemplateComponent } from '@/lib/whatsapp/cloud/types';

/**
 * POST /api/whatsapp/send
 *
 * Sends a message from the Desk to a customer.
 *
 * Body (text):
 *   { to: "+97150…", body: "…", reply_to_wamid?: "wamid.…" }
 *
 * Body (template — required when no incoming message in the last 24h):
 *   { to: "+97150…", template_name: "payment_confirmed",
 *     language?: "en" | "ar", components?: [...] }
 *
 * Mock mode (no env): returns ok with a synthetic wamid so the Desk
 * UI still shows the message as sent during preview.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to } = body;
    if (!to) {
      return NextResponse.json({ ok: false, error: 'missing_to' }, { status: 400 });
    }

    if (!isCloudConfigured()) {
      return NextResponse.json({
        ok: true,
        mode: 'mock',
        wamid: `mock_${Date.now()}`,
        note: 'WhatsApp Cloud API not configured. Set WHATSAPP_* env vars.',
      });
    }

    if (body.template_name) {
      const result = await sendTemplate({
        to,
        template_name: body.template_name,
        language: body.language,
        components: body.components as WACloudTemplateComponent[] | undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ mode: 'real', ...result }, { status: 502 });
      }
      return NextResponse.json({ ok: true, mode: 'real', wamid: result.wamid });
    }

    if (typeof body.body !== 'string' || body.body.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'missing_body' }, { status: 400 });
    }

    const result = await sendText({
      to,
      body: body.body,
      reply_to_wamid: body.reply_to_wamid,
      preview_url: body.preview_url,
    });
    if (!result.ok) {
      return NextResponse.json({ mode: 'real', ...result }, { status: 502 });
    }
    return NextResponse.json({ ok: true, mode: 'real', wamid: result.wamid });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
