import { NextResponse } from 'next/server';

import { tamperRecord } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DEMO amaçlı: bir kaydı rowHash'i güncellemeden değiştirir (cascade gösterimi).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { id, field, value } = body ?? {};
    if (!id || !field || typeof value !== 'string') {
      return NextResponse.json({ error: 'id, field, value gerekli' }, { status: 400 });
    }
    await tamperRecord(id, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
