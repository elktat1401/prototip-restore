'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FlaskConical, MoreVertical, RefreshCw, Search, ShieldCheck, ShieldX, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { shortHash, verifyChain } from '@/lib/consent/hash-chain';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import {
  ACTION_LABELS,
  type ChainVerification,
  type ConsentRecord,
  DOCUMENT_LABELS
} from '@/lib/consent/types';
import { formatInstant } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChainLinkVisual } from '@/components/consent/chain-link-visual';
import { HashValue } from '@/components/consent/hash-value';
import { RecordInspector } from '@/components/consent/record-inspector';

export function HashChainExplorer() {
  const { records, ready, tamper } = useConsentStore();
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);

  const sorted = useMemo(() => [...records].sort((a, b) => a.seq - b.seq), [records]);
  const vmap = useMemo(
    () => new Map((verification?.records ?? []).map(v => [v.seq, v] as const)),
    [verification]
  );

  async function runVerify(records: ConsentRecord[]) {
    setVerifying(true);
    const v = await verifyChain(records);
    setVerification(v);
    setVerifying(false);
    return v;
  }

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setVerifying(true);
    verifyChain(records).then(v => {
      if (!cancelled) {
        setVerification(v);
        setVerifying(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [records, ready]);

  const inspectRecord = sorted.find(r => r.id === inspectId) ?? null;
  const inspectVerification = inspectRecord ? vmap.get(inspectRecord.seq) ?? null : null;

  function openInspector(r: ConsentRecord) {
    setInspectId(r.id);
    setInspectOpen(true);
  }

  function tamperTime(r: ConsentRecord) {
    const shifted = new Date(Date.parse(r.occurredAt) + 86_400_000).toISOString();
    tamper(r.id, 'occurredAt', shifted);
    toast.warning('Kayıt kurcalandı', {
      description: `#${r.seq} occurredAt +1 gün kaydırıldı; rowHash güncellenmedi. Zincir artık bozuk.`
    });
  }

  function tamperAction(r: ConsentRecord) {
    const flipped = r.action === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    tamper(r.id, 'action', flipped);
    toast.warning('Kayıt kurcalandı', {
      description: `#${r.seq} eylemi ${flipped} olarak değiştirildi; rowHash güncellenmedi.`
    });
  }

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Defter yükleniyor…</p>;
  }

  const valid = verification?.valid ?? true;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {verifying ? (
                  <RefreshCw className="text-muted-foreground size-5 animate-spin" />
                ) : valid ? (
                  <ShieldCheck className="size-5 text-emerald-500" />
                ) : (
                  <ShieldX className="text-destructive size-5" />
                )}
                {verifying
                  ? 'Zincir doğrulanıyor…'
                  : valid
                    ? 'Zincir bütünlüğü: GEÇERLİ'
                    : 'Zincir bütünlüğü: BOZULDU'}
              </CardTitle>
              <CardDescription>
                {verification ? `${verification.total} kayıt` : `${sorted.length} kayıt`}
                {!verifying && !valid && verification?.firstBrokenSeq !== null && (
                  <span className="text-destructive"> · ilk kırık kayıt #{verification?.firstBrokenSeq}</span>
                )}
                {!verifying && valid && ' · tüm rowHash ve prevHash bağları sağlam'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => runVerify(records)} disabled={verifying}>
              <RefreshCw className={verifying ? 'size-4 animate-spin' : 'size-4'} />
              Yeniden doğrula
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChainLinkVisual records={records} verification={verification} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rıza Defteri (append-only)</CardTitle>
          <CardDescription>
            Her satır değişmez bir olaydır. &quot;Kurcala&quot; ile bir alanı değiştirip (rowHash güncellenmeden)
            zincirin nasıl bozulduğunu görebilirsin.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Zaman (occurredAt)</TableHead>
                <TableHead>Olay</TableHead>
                <TableHead>Belge</TableHead>
                <TableHead>rowHash</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(r => {
                const v = vmap.get(r.seq);
                const ok = (v?.contentIntact ?? true) && (v?.linkIntact ?? true);
                return (
                  <TableRow key={r.id} className={ok ? undefined : 'bg-destructive/5'}>
                    <TableCell className="font-medium">{r.seq}</TableCell>
                    <TableCell className="text-xs">{formatInstant(r.occurredAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.action === 'GRANTED'
                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                            : 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                        }
                      >
                        {ACTION_LABELS[r.action]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="max-w-[180px] truncate" title={DOCUMENT_LABELS[r.documentType]}>
                        {DOCUMENT_LABELS[r.documentType]}
                      </div>
                      <span className="hash-mono text-muted-foreground text-[10px]">{r.documentVersion}</span>
                    </TableCell>
                    <TableCell>
                      <span className="hash-mono text-[11px]" title={r.rowHash}>
                        {shortHash(r.rowHash)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {ok ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <CheckCircle2 className="size-4 text-emerald-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>İçerik ve zincir bağı sağlam</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <XCircle className="text-destructive size-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {!v?.contentIntact && 'İçerik bozuk (rowHash eşleşmiyor). '}
                            {!v?.linkIntact && 'Zincir bağı kopuk (prevHash).'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openInspector(r)}>
                          <Search className="size-4" />
                          İncele
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Kurcala menüsü">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="flex items-center gap-1.5">
                              <FlaskConical className="size-3.5" />
                              Kurcalama (demo)
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => tamperTime(r)}>
                              <Clock className="size-4" />
                              Zamanı oynat (occurredAt +1 gün)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => tamperAction(r)}>
                              <ShieldX className="size-4" />
                              Eylemi çevir ({r.action === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED'})
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecordInspector
        record={inspectRecord}
        verification={inspectVerification}
        open={inspectOpen}
        onOpenChange={setInspectOpen}
      />
    </div>
  );
}
