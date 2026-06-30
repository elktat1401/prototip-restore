'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { getCurrentVersion } from '@/lib/consent/documents';
import { composePresentedNotice, getReconsentRequirements } from '@/lib/consent/store';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/consent/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LegalDocumentDialog } from '@/components/consent/legal-document';

function reconsentLabel(type: DocumentType, version: string): string {
  return `${DOCUMENT_LABELS[type]} (${version}) — güncellenen sürümü okudum ve kabul ediyorum.`;
}

export function ReconsentGate({ onSatisfied }: { onSatisfied?: () => void }) {
  const { records, ready, appendEvents } = useConsentStore();
  const requirements = useMemo(
    () => (ready ? getReconsentRequirements(records) : []),
    [records, ready]
  );

  const [checked, setChecked] = useState<Partial<Record<DocumentType, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const wasOpen = useRef(false);

  const open = requirements.length > 0;

  // Bariyer açıkken kapanırsa (tüm onaylar verildi) → onSatisfied.
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      wasOpen.current = false;
      onSatisfied?.();
    }
  }, [open, onSatisfied]);

  const allChecked = requirements.every(t => checked[t]);

  async function handleSubmit() {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    try {
      const inputs = requirements.map(type => {
        const version = getCurrentVersion(type).version;
        return {
          documentType: type,
          documentVersion: version,
          action: 'GRANTED' as const,
          method: 'reconsent_modal' as const,
          presentedNoticeText: composePresentedNotice(type, version, reconsentLabel(type, version))
        };
      });
      await appendEvents(inputs);
      setChecked({});
      toast.success('Güncel sözleşmeler onaylandı', {
        description: `${inputs.length} yeniden-onay kaydı zincire eklendi.`
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="text-amber-500" />
            Sözleşmeler güncellendi
          </DialogTitle>
          <DialogDescription>
            Devam edebilmek için, esaslı şekilde değişen aşağıdaki metinleri onaylaman gerekiyor. Bu adım
            geçilemez (Katalog §1 — Bariyer / Interception).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-3">
            {requirements.map(type => {
              const doc = getCurrentVersion(type);
              return (
                <div key={type} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{DOCUMENT_LABELS[type]}</span>
                    <Badge variant="secondary" className="hash-mono text-[10px]">
                      {doc.version}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-xs">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    <span>{doc.changeSummary}</span>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <Checkbox
                      id={`reconsent-${type}`}
                      checked={!!checked[type]}
                      onCheckedChange={v => setChecked(prev => ({ ...prev, [type]: Boolean(v) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor={`reconsent-${type}`} className="text-sm leading-snug font-normal">
                        {reconsentLabel(type, doc.version)}
                      </Label>
                      <div>
                        <LegalDocumentDialog doc={doc}>
                          <button type="button" className="text-primary text-xs underline-offset-2 hover:underline">
                            Güncel metni oku
                          </button>
                        </LegalDocumentDialog>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Button onClick={handleSubmit} disabled={!allChecked || submitting} className="w-full">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Onayla ve devam et
        </Button>
      </DialogContent>
    </Dialog>
  );
}
