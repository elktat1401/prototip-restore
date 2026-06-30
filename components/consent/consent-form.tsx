'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Info, Loader2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';

import { getCurrentVersion } from '@/lib/consent/documents';
import { CHECKBOX_LABELS } from '@/lib/consent/copy';
import { composePresentedNotice } from '@/lib/consent/store';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import { type ConsentMethod, type ConsentRecord, type DocumentType } from '@/lib/consent/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConsentCheckboxItem } from '@/components/consent/consent-checkbox-item';
import { ConsentReceiptDialog } from '@/components/consent/consent-receipt-dialog';

export function ConsentForm({
  documentTypes,
  requiredTypes,
  method,
  submitLabel,
  onComplete
}: {
  documentTypes: DocumentType[];
  requiredTypes: DocumentType[];
  method: ConsentMethod;
  submitLabel: string;
  onComplete?: (records: ConsentRecord[]) => void;
}) {
  const { appendEvents } = useConsentStore();
  const docs = useMemo(
    () => documentTypes.map(type => ({ type, doc: getCurrentVersion(type) })),
    [documentTypes]
  );

  const [checked, setChecked] = useState<Partial<Record<DocumentType, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ConsentRecord[] | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const requiredOk = requiredTypes.every(t => checked[t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredOk || submitting) return;

    const inputs = docs
      .filter(({ type }) => checked[type])
      .map(({ type, doc }) => ({
        documentType: type,
        documentVersion: doc.version,
        action: 'GRANTED' as const,
        method,
        presentedNoticeText: composePresentedNotice(type, doc.version, CHECKBOX_LABELS[type])
      }));

    if (inputs.length === 0) {
      toast.info('Onaylanacak bir madde seçilmedi.');
      return;
    }

    setSubmitting(true);
    try {
      const next = await appendEvents(inputs);
      const createdRecs = next.slice(next.length - inputs.length);
      setCreated(createdRecs);
      setReceiptOpen(true);
      toast.success('Onaylar hash-zincirine eklendi', {
        description: `${createdRecs.length} kayıt oluşturuldu (#${createdRecs[0].seq}–#${
          createdRecs[createdRecs.length - 1].seq
        }).`
      });
      onComplete?.(createdRecs);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <>
        <Alert className="border-emerald-500/40">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <AlertTitle>Onaylar kaydedildi</AlertTitle>
          <AlertDescription>
            {created.length} değişmez kayıt oluşturuldu ve SHA-256 hash zincirine eklendi (#{created[0].seq}–#
            {created[created.length - 1].seq}).
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setReceiptOpen(true)}>
            <ReceiptText className="size-4" />
            Makbuzu yeniden gör
          </Button>
          <Button asChild>
            <Link href="/ledger">
              Hash-Chain defterini aç
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ConsentReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} records={created} />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Info className="size-4" />
        <AlertTitle>Kutucuklar önceden işaretli değildir</AlertTitle>
        <AlertDescription>
          KVKK/GDPR gereği rıza özgür irade ile verilir — her kutucuğu kendin işaretlemelisin. Onay anında metnin
          sürümü, tam zaman damgası, IP ve yöntem kayda geçer.
        </AlertDescription>
      </Alert>

      <div className="space-y-2.5">
        {docs.map(({ type, doc }) => (
          <ConsentCheckboxItem
            key={type}
            id={`consent-${type}`}
            doc={doc}
            label={CHECKBOX_LABELS[type]}
            required={requiredTypes.includes(type)}
            checked={!!checked[type]}
            onCheckedChange={v => setChecked(prev => ({ ...prev, [type]: v }))}
          />
        ))}
      </div>

      <Button type="submit" disabled={!requiredOk || submitting} className="w-full">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
