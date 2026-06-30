import { NextResponse } from 'next/server';

import { getDocumentRow } from '@/lib/server/consent-repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const document = await getDocumentRow(type);
  if (!document) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
  return NextResponse.json({ document });
}
