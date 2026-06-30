import { NextResponse } from 'next/server';

import { resetLedger } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DEMO amaçlı: defteri başlangıç (seed) verisine döndürür.
export async function POST() {
  await resetLedger();
  return NextResponse.json({ ok: true });
}
