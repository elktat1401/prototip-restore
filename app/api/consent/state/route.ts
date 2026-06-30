import { NextResponse } from 'next/server';

import { getState } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const asOf = new URL(req.url).searchParams.get('asOf') ?? undefined;
  const state = await getState(asOf);
  return NextResponse.json({ state, asOf: asOf ?? null });
}
