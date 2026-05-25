import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isAIEnabled, resolveModelName } from '@/lib/ai/client';

/**
 * POST /api/inventory/invoice-scan
 * Body: { image_base64: string, mime_type?: string }
 *   OR : multipart/form-data with field 'image'
 *
 * Sends the invoice image to Gemini Vision (multimodal). Extracts:
 *   • supplier_name
 *   • invoice_number, invoice_date, currency
 *   • line_items[]: { description, sku?, qty, unit_cost, total_cost,
 *                     suggested_master_sku, suggested_category, suggested_material }
 *   • totals: { subtotal, tax, total }
 *
 * Then the Stores page can pre-fill the Add Product form for each line.
 *
 * Without GOOGLE_API_KEY: returns a deterministic mock invoice so the UI
 * flow stays demoable.
 */

const PROMPT = `
You are the OmniaStores Invoice Reader. You receive a photo or scan of a
supplier purchase invoice for jewellery. Extract every line item plus
supplier and totals. For each line, also suggest:
  • suggested_master_sku  — a clean SKU we'd use internally (uppercase,
                            material prefix, sequence). E.g. "CR-925-07"
                            for a 925 silver crescent ring sequence 7.
  • suggested_category    — Rings, Necklaces, Earrings, Bracelets,
                            Bridal Sets, or "Other"
  • suggested_material    — 925 silver / 18k gold / rose gold / etc.

Return strict JSON with this shape:
{
  "supplier_name": string,
  "invoice_number": string | null,
  "invoice_date": string | null,
  "currency": "AED" | "USD" | "EUR" | "INR" | "OMR" | "SAR" | "OTHER",
  "subtotal": number | null,
  "tax": number | null,
  "total": number | null,
  "line_items": [
    {
      "description": string,
      "sku": string | null,
      "qty": number,
      "unit_cost": number | null,
      "total_cost": number | null,
      "suggested_master_sku": string,
      "suggested_category": string,
      "suggested_material": string
    }
  ]
}

No markdown fences. No commentary.
`.trim();

function mockInvoice() {
  return {
    supplier_name: 'Al Mahara Jewellery Imports LLC',
    invoice_number: 'INV-2026-04122',
    invoice_date: new Date().toISOString().slice(0, 10),
    currency: 'AED',
    subtotal: 18450,
    tax: 922.5,
    total: 19372.5,
    line_items: [
      { description: 'Crescent ring · 925 silver · size 7', sku: 'CR-925-07', qty: 12, unit_cost: 320, total_cost: 3840,
        suggested_master_sku: 'CR-925-07', suggested_category: 'Rings', suggested_material: '925 silver' },
      { description: 'Moonstone pendant · rose gold setting', sku: 'MS-RG-01', qty: 6, unit_cost: 540, total_cost: 3240,
        suggested_master_sku: 'MS-RG-01', suggested_category: 'Necklaces', suggested_material: 'rose gold' },
      { description: 'Bridal stack · 18k gold · set of three rings', sku: null, qty: 3, unit_cost: 2450, total_cost: 7350,
        suggested_master_sku: 'BR-SET-02', suggested_category: 'Bridal Sets', suggested_material: '18k gold' },
      { description: 'Hoop earrings · 18k gold · 18mm', sku: 'EA-HP-04', qty: 8, unit_cost: 502.5, total_cost: 4020,
        suggested_master_sku: 'EA-HP-04', suggested_category: 'Earrings', suggested_material: '18k gold' },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';

    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('image');
      if (file && typeof file !== 'string') {
        const buf = Buffer.from(await file.arrayBuffer());
        imageBase64 = buf.toString('base64');
        mimeType = (file as File).type || mimeType;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      imageBase64 = body.image_base64 || null;
      if (body.mime_type) mimeType = body.mime_type;
    }

    if (!isAIEnabled()) {
      return NextResponse.json({ ok: true, mode: 'mock', invoice: mockInvoice(), reason: 'GOOGLE_API_KEY not set' });
    }

    if (!imageBase64) {
      return NextResponse.json({ ok: true, mode: 'mock', invoice: mockInvoice(), reason: 'no image — returning sample so the UI demoable' });
    }

    // Use Gemini Vision directly — callJSON doesn't support inline image parts.
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!;
    const client = new GoogleGenerativeAI(key);
    const modelName = resolveModelName('default');
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 2500,
      },
    });

    let invoice: any = null;
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        { text: 'Extract the line items from this invoice.' },
      ]);
      const text = result.response.text();
      try { invoice = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) try { invoice = JSON.parse(m[0]); } catch {}
      }
    } catch (err: any) {
      return NextResponse.json({ ok: true, mode: 'mock_fallback', invoice: mockInvoice(), error: err?.message });
    }

    if (!invoice) {
      return NextResponse.json({ ok: true, mode: 'mock_fallback', invoice: mockInvoice(), reason: 'Could not parse Gemini response' });
    }

    return NextResponse.json({ ok: true, mode: 'real', model: modelName, invoice });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Invoice scan failed' }, { status: 500 });
  }
}
