import { NextResponse } from 'next/server';
import { transcribeWhatsappAudio } from '@/lib/operations/store';

// AI listens to a customer voice note and returns a transcript + concise summary.
// Wire-shaped to accept a real audio URL when the integration ships; for now uses
// deterministic mock transcripts keyed off the filename (mockTranscriptFor in
// lib/operations/store.ts) so the WhatsApp Desk UI flow is testable end-to-end.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.conversation_id || !body.message_id || !body.filename) {
      return NextResponse.json({ ok: false, error: 'conversation_id, message_id, filename are required' }, { status: 400 });
    }
    const transcription = await transcribeWhatsappAudio({
      conversation_id: body.conversation_id,
      message_id: body.message_id,
      filename: body.filename,
      language: body.language,
      duration_sec: body.duration_sec,
      transcript: body.transcript,
      summary: body.summary,
    });
    return NextResponse.json({ ok: true, transcription });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not transcribe' }, { status: 400 });
  }
}
