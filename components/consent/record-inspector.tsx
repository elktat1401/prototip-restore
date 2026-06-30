'use client';

import { CheckCircle2, Link2, Link2Off, XCircle } from 'lucide-react';

import { canonicalize, previewPreimage, toPayload } from '@/lib/consent/hash-chain';
import {
  ACTION_LABELS,
  type ConsentRecord,
  DOCUMENT_LABELS,
  METHOD_LABELS,
  type RecordVerification
} from '@/lib/consent/types';
import { formatInstantWithUtc } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { HashValue } from '@/components/consent/hash-value';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="col-span-2 text-sm break-words">{children}</span>
    </div>
  );
}

export function RecordInspector({
  record,
  verification,
  open,
  onOpenChange
}: {
  record: ConsentRecord | null;
  verification: RecordVerification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!record) return null;

  const canonical = canonicalize(toPayload(record));
  const preimage = previewPreimage(record);
  const contentIntact = verification?.contentIntact ?? true;
  const linkIntact = verification?.linkIntact ?? true;
  const expected = verification?.expectedRowHash ?? record.rowHash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Kayıt #{record.seq}
            <Badge variant="secondary" className="hash-mono text-[10px]">
              {record.documentVersion}
            </Badge>
            <Badge
              variant="outline"
              className={
                record.action === 'GRANTED'
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-amber-500/40 text-amber-600 dark:text-amber-400'
              }
            >
              {ACTION_LABELS[record.action]}
            </Badge>
          </DialogTitle>
          <DialogDescription>{DOCUMENT_LABELS[record.documentType]}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          {/* Bütünlük durumu */}
          <div
            className={
              contentIntact && linkIntact
                ? 'flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400'
                : 'flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'
            }
          >
            {contentIntact && linkIntact ? (
              <>
                <CheckCircle2 className="size-4" />
                Bütünlük doğrulandı: içerik ve zincir bağı sağlam.
              </>
            ) : (
              <>
                <XCircle className="size-4" />
                {!contentIntact && 'İçerik bütünlüğü BOZUK (rowHash eşleşmiyor). '}
                {!linkIntact && 'Zincir bağı BOZUK (prevHash bir önceki rowHash’e oturmuyor).'}
              </>
            )}
          </div>

          {/* Katman 3.1 — hesap */}
          <h4 className="mt-4 mb-1 text-sm font-semibold">Katman 3.1 — Hash hesabı</h4>
          <div className="space-y-2 rounded-lg border p-3">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">1) Önceki hash (prevHash)</span>
              <HashValue value={record.prevHash} full className="block" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">2) canonical(payload) — deterministik JSON</span>
              <p className="hash-mono bg-muted rounded p-2 text-[11px] leading-relaxed">{canonical}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">3) preimage = prevHash ⧺ &quot;\n&quot; ⧺ canonical</span>
              <p className="hash-mono bg-muted max-h-28 overflow-auto rounded p-2 text-[11px] leading-relaxed">
                {preimage}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">4) SHA-256(preimage) — yeniden hesaplanan</span>
              <HashValue value={expected} full tone={contentIntact ? 'ok' : 'broken'} className="block" />
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Saklanan rowHash</span>
              <HashValue value={record.rowHash} full tone={contentIntact ? 'ok' : 'broken'} className="block" />
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {linkIntact ? (
                <Link2 className="size-3.5 text-emerald-500" />
              ) : (
                <Link2Off className="text-destructive size-3.5" />
              )}
              Zincir bağı: prevHash {linkIntact ? '✓ bir önceki rowHash’e oturuyor' : '✗ kopuk'}
            </p>
          </div>

          {/* Tüm alanlar */}
          <h4 className="mt-4 mb-1 text-sm font-semibold">Tüm alanlar</h4>
          <div className="divide-y rounded-lg border px-3">
            <Row label="id">
              <span className="hash-mono text-xs">{record.id}</span>
            </Row>
            <Row label="seq">{record.seq}</Row>
            <Row label="Kişi">
              {record.subjectEmail} · {record.subjectId}
            </Row>
            <Row label="Tenant">{record.tenantId}</Row>
            <Row label="Belge">
              {DOCUMENT_LABELS[record.documentType]} ({record.documentVersion})
            </Row>
            <Row label="documentContentHash">
              <HashValue value={record.documentContentHash} />
            </Row>
            <Row label="Eylem">{ACTION_LABELS[record.action]}</Row>
            <Row label="Yöntem">{METHOD_LABELS[record.method]}</Row>
            <Row label="presentedNoticeHash">
              <HashValue value={record.presentedNoticeHash} />
            </Row>
            <Row label="IP / UA">
              <span className="hash-mono text-xs">{record.ipAddress}</span>
              <div className="text-muted-foreground hash-mono mt-0.5 text-[10px] break-all">{record.userAgent}</div>
            </Row>
            <Row label="occurredAt (AN)">
              <span className="hash-mono text-xs">{record.occurredAt}</span>
              <div className="text-muted-foreground text-xs">{formatInstantWithUtc(record.occurredAt)}</div>
            </Row>
            <Row label="recordedAt (sistem)">
              <span className="hash-mono text-xs">{record.recordedAt}</span>
            </Row>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
