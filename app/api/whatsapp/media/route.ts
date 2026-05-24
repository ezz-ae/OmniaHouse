import { NextResponse } from 'next/server';
import { getMediaDownloadUrl, downloadMediaBytes, isCloudConfigured } from '@/lib/whatsapp/cloud/client';

/**
 * GET /api/whatsapp/media?id=<media_id>
 *
 * Fetches a media file from Meta's CDN using our bearer token, then
 * streams the bytes back to the browser. We need this proxy because
 * Meta's media URL requires the same bearer the webhook saw — it's
 * not a public link.
 *
 * Use cases:
 *   - Show a payment-proof PDF in the Customer drawer.
 *   - Pipe an image into MEDIA_VERIFICATION_PROMPT.
 *   - Save a bridal-photo reference into Drive Room.
 *
 * Caching: the Meta URL is short-lived (~5 min). We re-resolve on every
 * request, so this is fine for occasional reads but heavy media should
 * be persisted to durable storage on first fetch (TODO).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mediaId = url.searchParams.get('id');
  if (!mediaId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  if (!isCloudConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const meta = await getMediaDownloadUrl(mediaId);
  if (!meta.ok) {
    return NextResponse.json({ error: meta.error }, { status: 502 });
  }

  const bytes = await downloadMediaBytes(meta.url);
  if (!bytes.ok) {
    return NextResponse.json({ error: bytes.error }, { status: 502 });
  }

  return new NextResponse(bytes.bytes, {
    status: 200,
    headers: {
      'Content-Type': bytes.mime_type || meta.mime_type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
