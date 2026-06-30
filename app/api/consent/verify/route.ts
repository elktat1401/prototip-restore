import { NextResponse } from 'next/server';

import { getVerification } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const verification = await getVerification();
  return NextResponse.json({ verification });
}
