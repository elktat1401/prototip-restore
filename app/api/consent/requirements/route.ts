import { NextResponse } from 'next/server';

import { getRequirements } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const requirements = await getRequirements();
  return NextResponse.json({ requirements });
}
