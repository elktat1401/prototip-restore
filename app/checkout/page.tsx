import { ShoppingCart } from 'lucide-react';

import { CHECKOUT_DOCUMENTS } from '@/lib/consent/types';
import { PageHeader } from '@/components/page-header';
import { ConsentForm } from '@/components/consent/consent-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Checkout — Satın Alma Sözleşmeleri"
        description="Freemium’dan ücretli plana (Pro) geçiş. Satın almaya özgü sözleşmeler burada, signup’takine benzer onay akışıyla sunulur ve aynı hash zincirine eklenir."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="size-4" />
            Sipariş Özeti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">GitSec Pro</p>
              <p className="text-muted-foreground text-xs">Aylık abonelik · otomatik yenileme</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              ₺149 / ay
            </Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card">Kart numarası</Label>
              <Input id="card" defaultValue="•••• •••• •••• 4242" disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp">SKT / CVC</Label>
              <Input id="exp" defaultValue="12/28 · •••" disabled />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">(Ödeme alanları demo amaçlı sabittir.)</p>

          <Separator />

          <ConsentForm
            documentTypes={[...CHECKOUT_DOCUMENTS]}
            requiredTypes={[...CHECKOUT_DOCUMENTS]}
            method="checkout_form_checkbox"
            submitLabel="Ödemeyi tamamla"
          />
        </CardContent>
      </Card>
    </div>
  );
}
