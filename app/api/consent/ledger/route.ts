import { NextResponse } from 'next/server';

import { getLedger } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const records = await getLedger();
  return NextResponse.json({ records });
}
