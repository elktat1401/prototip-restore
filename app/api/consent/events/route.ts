import { NextResponse } from 'next/server';

import { appendConsentEvents } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const events = body?.events;
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'events[] gerekli' }, { status: 400 });
    }
    const shapeOk = events.every(
      (e: unknown) =>
        !!e &&
        typeof (e as Record<string, unknown>).documentType === 'string' &&
        ((e as Record<string, unknown>).action === 'GRANTED' ||
          (e as Record<string, unknown>).action === 'WITHDRAWN') &&
        typeof (e as Record<string, unknown>).method === 'string' &&
        typeof (e as Record<string, unknown>).presentedNoticeText === 'string'
    );
    if (!shapeOk) {
      return NextResponse.json({ error: 'Geçersiz event şekli (documentType/action/method/presentedNoticeText)' }, { status: 400 });
    }
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const created = await appendConsentEvents(events, { ipAddress, userAgent, locale: 'tr-TR' });
    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
