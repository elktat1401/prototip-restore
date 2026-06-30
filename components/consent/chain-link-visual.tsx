'use client';

import { Fragment } from 'react';
import { Link2, Link2Off } from 'lucide-react';

import { shortHash } from '@/lib/consent/hash-chain';
import { type ChainVerification, type ConsentRecord, DOCUMENT_LABELS } from '@/lib/consent/types';
import { cn } from '@/lib/utils';

function Connector({ ok }: { ok: boolean }) {
  return (
    <div className="flex min-w-8 flex-col items-center justify-center self-center">
      {ok ? (
        <Link2 className="size-4 text-emerald-500" />
      ) : (
        <Link2Off className="text-destructive size-4" />
      )}
      <div className={cn('h-px w-full', ok ? 'bg-emerald-500/40' : 'bg-destructive/50')} />
    </div>
  );
}

export function ChainLinkVisual({
  records,
  verification
}: {
  records: ConsentRecord[];
  verification: ChainVerification | null;
}) {
  const sorted = [...records].sort((a, b) => a.seq - b.seq);
  const vmap = new Map((verification?.records ?? []).map(v => [v.seq, v] as const));

  return (
    <div className="flex items-stretch overflow-x-auto pb-2">
      {/* GENESIS */}
      <div className="bg-muted/50 text-muted-foreground flex min-w-[120px] flex-col justify-center rounded-lg border border-dashed p-2.5 text-center">
        <span className="text-[10px] font-semibold tracking-wide uppercase">Genesis</span>
        <span className="hash-mono mt-1 text-[10px]">{shortHash('0'.repeat(64))}</span>
      </div>

      {sorted.map(r => {
        const v = vmap.get(r.seq);
        const contentOk = v?.contentIntact ?? true;
        const linkOk = v?.linkIntact ?? true;
        return (
          <Fragment key={r.id}>
            <Connector ok={linkOk} />
            <div
              className={cn(
                'flex min-w-[150px] flex-col gap-1 rounded-lg border p-2.5',
                !contentOk
                  ? 'border-destructive/50 bg-destructive/5'
                  : !linkOk
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-emerald-500/40 bg-emerald-500/5'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">#{r.seq}</span>
                <span
                  className={cn(
                    'size-2 rounded-full',
                    r.action === 'GRANTED' ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  title={r.action}
                />
              </div>
              <span className="text-muted-foreground truncate text-[11px]" title={DOCUMENT_LABELS[r.documentType]}>
                {DOCUMENT_LABELS[r.documentType]}
              </span>
              <span className="hash-mono text-[10px]" title={r.rowHash}>
                {shortHash(r.rowHash)}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
