'use client';

import { useMemo } from 'react';
import { CheckCircle2, LayoutDashboard, ShieldAlert } from 'lucide-react';

import { getReconsentRequirements } from '@/lib/consent/store';
import { useConsentStore } from '@/lib/consent/use-consent-store';
import { DEMO_USER, DOCUMENT_LABELS } from '@/lib/consent/types';
import { PageHeader } from '@/components/page-header';
import { ReconsentGate } from '@/components/consent/reconsent-gate';
import { ResetDemoButton } from '@/components/reset-demo-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getInitialsFallback } from '@/lib/consent/copy';

export default function LoginPage() {
  const { records, ready } = useConsentStore();
  const requirements = useMemo(() => (ready ? getReconsentRequirements(records) : []), [records, ready]);
  const blocked = requirements.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Giriş — Yeniden Onay Bariyeri"
        description="Geri dönen kullanıcı giriş yaptığında, esaslı şekilde değişen sözleşmelerin güncel sürümü onaylanmadan ana sayfaya geçiş engellenir (Katalog §1)."
      />

      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{getInitialsFallback(DEMO_USER.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{DEMO_USER.name}</p>
              <p className="text-muted-foreground text-xs">{DEMO_USER.email}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            Oturum açık
          </Badge>
        </CardContent>
      </Card>

      {ready &&
        (blocked ? (
          <Alert className="border-amber-500/40">
            <ShieldAlert className="size-4 text-amber-500" />
            <AlertTitle>Devam etmeden önce onay gerekiyor</AlertTitle>
            <AlertDescription>
              Şu metinlerin güncel sürümü henüz onaylanmadı:{' '}
              <strong>{requirements.map(t => DOCUMENT_LABELS[t]).join(', ')}</strong>. Aşağıdaki ekranı
              tamamlamadan panele geçemezsin.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-emerald-500/40">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <AlertTitle>Tüm onayların güncel</AlertTitle>
            <AlertDescription className="space-y-2">
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="size-4" /> Panele erişebilirsin. Bariyer çıkmadı.
              </span>
              <span className="text-muted-foreground block text-xs">
                Bariyeri yeniden görmek için demoyu sıfırla (kullanıcı yeniden v1.0’a döner):
              </span>
              <ResetDemoButton variant="outline" />
            </AlertDescription>
          </Alert>
        ))}

      {/* Esaslı değişiklik varsa kapatılamaz modal otomatik açılır. */}
      <ReconsentGate />
    </div>
  );
}
