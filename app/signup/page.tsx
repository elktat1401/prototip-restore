import { Info } from 'lucide-react';

import { DEMO_USER, SIGNUP_DOCUMENTS } from '@/lib/consent/types';
import { PageHeader } from '@/components/page-header';
import { ConsentForm } from '@/components/consent/consent-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Kayıt — Onay Yakalama"
        description="Freemium hesap oluşturma. Onay anında metnin sürümü, tam zaman damgası, IP ve yöntem değişmez bir kayda geçer ve hash zincirine eklenir."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Hesap oluştur
            <Badge variant="secondary">Freemium</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" defaultValue={DEMO_USER.name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" defaultValue={DEMO_USER.email} disabled />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            (Form alanları demo amaçlı sabittir.) Asıl odak: aşağıdaki rıza yakalama.
          </p>

          <ConsentForm
            documentTypes={[...SIGNUP_DOCUMENTS]}
            requiredTypes={['terms', 'privacy', 'acceptable_use_policy', 'dpa']}
            method="signup_form_checkbox"
            submitLabel="Hesabı oluştur"
          />
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Satın alma sözleşmeleri burada değil</AlertTitle>
        <AlertDescription>
          Süreç Freemium’dan başladığı için Mesafeli Satış & Ön Bilgilendirme metinleri kayıt adımında
          gösterilmez; ücretli plana geçişte <strong>checkout</strong> adımında benzer akışla sunulur.
        </AlertDescription>
      </Alert>
    </div>
  );
}
