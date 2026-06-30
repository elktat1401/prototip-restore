'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, MinusCircle, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { getCurrentVersion } from '@/lib/consent/documents';
import { CHECKBOX_LABELS } from '@/lib/consent/copy';
import { composePresentedNotice, deriveCurrentState } from '@/lib/consent/store';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import {
  type CurrentConsentState,
  DOCUMENT_LABELS,
  OPTIONAL_CONSENT_DOCUMENTS
} from '@/lib/consent/types';
import { formatInstantWithUtc } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function WithdrawButton({ state }: { state: CurrentConsentState }) {
  const { withdraw } = useConsentStore();
  const [open, setOpen] = useState(false);

  async function handleWithdraw() {
    await withdraw({
      documentType: state.documentType,
      documentVersion: state.latest.documentVersion,
      method: 'profile_withdraw_button',
      presentedNoticeText: composePresentedNotice(
        state.documentType,
        state.latest.documentVersion,
        `${DOCUMENT_LABELS[state.documentType]} rızasını geri çek.`
      )
    });
    setOpen(false);
    toast.success('Rıza geri çekildi', {
      description: 'Mevcut kayıt SİLİNMEDİ; zincire yeni bir WITHDRAWN kaydı eklendi.'
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MinusCircle className="size-4" />
          Rızayı geri çek
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rızayı geri çek?</AlertDialogTitle>
          <AlertDialogDescription>
            {DOCUMENT_LABELS[state.documentType]} için verdiğin rıza geri çekilecek. GDPR md.7(3) gereği bu işlem
            onay vermek kadar kolaydır. Geçmiş kayıt silinmez; defterin sonuna bir <strong>WITHDRAWN</strong>{' '}
            kaydı eklenir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={handleWithdraw}>Geri çek</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RegrantButton({ state }: { state: CurrentConsentState }) {
  const { grant } = useConsentStore();

  async function handleGrant() {
    const version = getCurrentVersion(state.documentType).version;
    await grant({
      documentType: state.documentType,
      documentVersion: version,
      method: 'profile_toggle',
      presentedNoticeText: composePresentedNotice(state.documentType, version, CHECKBOX_LABELS[state.documentType])
    });
    toast.success('Rıza yeniden verildi', { description: 'Zincire yeni bir GRANTED kaydı eklendi.' });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGrant}>
      <CheckCircle2 className="size-4" />
      Yeniden ver
    </Button>
  );
}

export function ConsentStatusList() {
  const { records, ready } = useConsentStore();

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;
  }

  const states = deriveCurrentState(records).sort((a, b) =>
    DOCUMENT_LABELS[a.documentType].localeCompare(DOCUMENT_LABELS[b.documentType])
  );

  if (states.length === 0) {
    return <p className="text-muted-foreground text-sm">Henüz rıza kaydı yok.</p>;
  }

  return (
    <div className="space-y-3">
      {states.map(state => {
        const optional = OPTIONAL_CONSENT_DOCUMENTS.includes(state.documentType);
        return (
          <Card key={state.documentType}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{DOCUMENT_LABELS[state.documentType]}</span>
                  <Badge variant="secondary" className="hash-mono text-[10px]">
                    {state.latest.documentVersion}
                  </Badge>
                  {state.isActive ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                      <ShieldX className="size-3" />
                      Geri çekildi
                    </Badge>
                  )}
                  {state.isStale && (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400">
                      <Clock className="size-3" />
                      Güncel: {state.currentVersion}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Son işlem: {formatInstantWithUtc(state.latest.occurredAt)}
                </p>
                {state.isStale && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Bu metnin güncel sürümü {state.currentVersion}. Bir sonraki girişte yeniden onay istenecek.
                  </p>
                )}
              </div>

              <div>
                {optional ? (
                  state.isActive ? (
                    <WithdrawButton state={state} />
                  ) : (
                    <RegrantButton state={state} />
                  )
                ) : (
                  <span className="text-muted-foreground text-xs">Hizmet için zorunlu</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
