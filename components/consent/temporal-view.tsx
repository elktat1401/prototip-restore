'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, History, ShieldX } from 'lucide-react';

import { deriveStateAsOf } from '@/lib/consent/store';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import { ACTION_LABELS, DOCUMENT_LABELS } from '@/lib/consent/types';
import { formatInstant } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const NOW_SENTINEL = '9999-12-31T23:59:59.999Z';

export function TemporalView() {
  const { records, ready } = useConsentStore();
  const [asOf, setAsOf] = useState<string | null>(null); // null = şimdi

  const timeline = useMemo(
    () => [...records].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.seq - b.seq),
    [records]
  );

  if (!ready) return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;

  const selected = asOf ?? NOW_SENTINEL;
  const state = deriveStateAsOf(records, selected).sort((a, b) =>
    DOCUMENT_LABELS[a.documentType].localeCompare(DOCUMENT_LABELS[b.documentType])
  );

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Zaman çizelgesi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            Zaman çizelgesi
          </CardTitle>
          <CardDescription>Bir ana tıkla; sağda o andaki rıza durumu görünür.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <button
            type="button"
            onClick={() => setAsOf(null)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
              asOf === null ? 'border-primary bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
            )}
          >
            Şimdi · tüm kayıtlar
          </button>
          {timeline.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setAsOf(r.occurredAt)}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left transition-colors',
                asOf === r.occurredAt ? 'border-primary bg-primary/10' : 'hover:bg-accent'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">#{r.seq}</span>
                <span className="text-muted-foreground text-[11px]">{formatInstant(r.occurredAt)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    r.action === 'GRANTED' ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                />
                {ACTION_LABELS[r.action]} · {DOCUMENT_LABELS[r.documentType]} ({r.documentVersion})
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* O andaki durum */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            {asOf ? `${formatInstant(asOf)} itibarıyla` : 'Şu an itibarıyla'} rıza durumu
          </CardTitle>
          <CardDescription>
            Katman 2.2 — &quot;şu tarihte rıza neydi?&quot; sorusunun temporal (time-travel) cevabı. Durum,
            append-only olaylardan TÜRETİLİR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.length === 0 ? (
            <p className="text-muted-foreground text-sm">Bu an itibarıyla henüz kayıt yok.</p>
          ) : (
            state.map(s => (
              <div key={s.documentType} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                <div className="flex items-center gap-2">
                  {s.isActive ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <ShieldX className="size-4 text-amber-500" />
                  )}
                  <span className="text-sm">{DOCUMENT_LABELS[s.documentType]}</span>
                  <Badge variant="secondary" className="hash-mono text-[10px]">
                    {s.latest.documentVersion}
                  </Badge>
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    s.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {ACTION_LABELS[s.latest.action]}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
