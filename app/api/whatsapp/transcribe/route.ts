import { NextResponse } from 'next/server';
import { transcribeWhatsappAudio } from '@/lib/operations/store';
import { isAIEnabled, callJSON, resolveModelName } from '@/lib/ai/client';

// AI listens to a customer voice note and returns a transcript + concise
// summary. When GOOGLE_API_KEY is set and a transcript text is available
// (either provided in the request or produced by the mock fallback), the
// route runs the transcript through Gemini to get a sharper summary +
// intent classification before persisting.

const VOICE_SUMMARY_PROMPT = `
You are the Omnia House WhatsApp voice-note analyst. Given a transcript
from a customer voice note (English, Arabic, or mixed), return:
  • summary  — one short sentence in English that captures intent + ask
  • intent   — one of: order_intent, size_question, payment_followup,
               delivery_question, complaint, gift_inquiry, callback_request, other
  • urgency  — low | medium | high | critical
  • language — en | ar | mixed
  • action   — one short sentence the agent should do next

Reply with strict JSON only.
`.trim();

type AISummary = {
  summary?: string;
  intent?: string;
  urgency?: string;
  language?: 'en' | 'ar' | 'mixed';
  action?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.conversation_id || !body.message_id || !body.filename) {
      return NextResponse.json({ ok: false, error: 'conversation_id, message_id, filename are required' }, { status: 400 });
    }

    // First pass: persist the mock/seeded transcript so we have a baseline.
    let transcription = await transcribeWhatsappAudio({
      conversation_id: body.conversation_id,
      message_id: body.message_id,
      filename: body.filename,
      language: body.language,
      duration_sec: body.duration_sec,
      transcript: body.transcript,
      summary: body.summary,
    });

    // Second pass: if Gemini is configured, run the transcript through the
    // model for a sharper summary + intent. Persist the AI summary on top
    // of the baseline so the desk shows the smart version.
    let mode: 'real' | 'mock' | 'mock_fallback' = isAIEnabled() ? 'real' : 'mock';
    let model: string | null = null;
    if (isAIEnabled() && transcription.transcript) {
      try {
        const ai = await callJSON<AISummary>({
          systemPrompt: VOICE_SUMMARY_PROMPT,
          userInput: `Transcript (${transcription.language}):\n${transcription.transcript}`,
          model: 'mini',
          temperature: 0.2,
        });
        if (ai && ai.summary) {
          transcription = await transcribeWhatsappAudio({
            conversation_id: body.conversation_id,
            message_id: body.message_id,
            filename: body.filename,
            language: ai.language || transcription.language,
            duration_sec: transcription.duration_sec ?? null,
            transcript: transcription.transcript,
            summary: ai.summary,
          });
          if (ai.intent) (transcription as any).intent = ai.intent;
          model = resolveModelName('mini');
        } else {
          mode = 'mock_fallback';
        }
      } catch {
        mode = 'mock_fallback';
      }
    }

    return NextResponse.json({ ok: true, transcription, mode, model });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not transcribe' }, { status: 400 });
  }
}
