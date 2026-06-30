'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, ShieldX } from 'lucide-react';

import { verifyChain } from '@/lib/consent/hash-chain';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LedgerSummary() {
  const { records, ready } = useConsentStore();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    verifyChain(records).then(v => {
      if (!cancelled) setValid(v.valid);
    });
    return () => {
      cancelled = true;
    };
  }, [records, ready]);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {valid === false ? (
            <ShieldX className="text-destructive size-8" />
          ) : (
            <ShieldCheck className="size-8 text-emerald-500" />
          )}
          <div>
            <p className="text-2xl font-semibold tabular-nums">{ready ? records.length : '—'}</p>
            <p className="text-muted-foreground text-xs">
              rıza kaydı ·{' '}
              {valid === null ? 'doğrulanıyor…' : valid ? 'zincir geçerli' : 'zincir bozuk'}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/ledger">
            Defteri aç
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
