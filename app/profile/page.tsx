import { Info } from 'lucide-react';

import { DEMO_USER } from '@/lib/consent/types';
import { PageHeader } from '@/components/page-header';
import { ConsentStatusList } from '@/components/consent/consent-status-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Profil & İzinler"
        description={`${DEMO_USER.name} — güncel rıza durumun. İsteğe bağlı rızaları (ör. pazarlama) buradan geri çekebilir veya yeniden verebilirsin.`}
      />

      <ConsentStatusList />

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Geri çekme nasıl loglanır?</AlertTitle>
        <AlertDescription>
          GDPR md.7(3) gereği rızayı geri çekmek, vermek kadar kolaydır. Geri çekildiğinde mevcut satır{' '}
          <strong>silinmez</strong> ve <code>true → false</code> yapılmaz; bunun yerine zincire yeni bir{' '}
          <strong>WITHDRAWN</strong> kaydı eklenir. Böylece veri işlenen dönemin hukuki dayanağı korunur.
        </AlertDescription>
      </Alert>
    </div>
  );
}
