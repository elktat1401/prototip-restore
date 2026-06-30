'use client';

import Link from 'next/link';
import { ArrowRight, ReceiptText } from 'lucide-react';

import { ACTION_LABELS, type ConsentRecord, DOCUMENT_LABELS, METHOD_LABELS } from '@/lib/consent/types';
import { formatInstantWithUtc } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { HashValue } from '@/components/consent/hash-value';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[11px] tracking-wide uppercase">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function ConsentReceiptCard({ record }: { record: ConsentRecord }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {DOCUMENT_LABELS[record.documentType]}
          <Badge variant="secondary" className="hash-mono text-[10px]">
            {record.documentVersion}
          </Badge>
        </div>
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
      </div>

      <Separator className="my-3" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kayıt #">{record.seq}</Field>
        <Field label="Kişi">{record.subjectEmail}</Field>
        <div className="col-span-2">
          <Field label="Ne zaman (occurredAt)">
            <span className="hash-mono text-xs">{record.occurredAt}</span>
            <div className="text-muted-foreground text-xs">{formatInstantWithUtc(record.occurredAt)}</div>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Nasıl (yöntem)">{METHOD_LABELS[record.method]}</Field>
        </div>
        <Field label="IP adresi">
          <span className="hash-mono text-xs">{record.ipAddress}</span>
        </Field>
        <Field label="Dil">{record.locale}</Field>
        <div className="col-span-2">
          <Field label="Metin içerik hash'i (neye onay verildi · Katman 1.1)">
            <HashValue value={record.documentContentHash} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Sunum hash'i (ne gösterildi · proof-of-presentation)">
            <HashValue value={record.presentedNoticeHash} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Önceki hash (prevHash · Katman 3.1)">
            <HashValue value={record.prevHash} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Bu kaydın hash'i (rowHash · Katman 3.1)">
            <HashValue value={record.rowHash} tone="ok" />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function ConsentReceiptDialog({
  open,
  onOpenChange,
  records
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: ConsentRecord[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="text-primary size-5" />
            Rıza Makbuzu
          </DialogTitle>
          <DialogDescription>
            Oluşturulan değişmez kayıt(lar). ISO/IEC 27560 consent-receipt mantığına yakındır; her kayıt hash
            zincirine eklenmiştir.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-3">
            {records.map(r => (
              <ConsentReceiptCard key={r.id} record={r} />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button asChild>
            <Link href="/ledger">
              Hash-Chain defterinde gör
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
