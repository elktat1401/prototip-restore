'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useConsentStore } from '@/lib/consent/use-consent-store';
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
import { Button } from '@/components/ui/button';

export function ResetDemoButton({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const { reset } = useConsentStore();
  const [open, setOpen] = useState(false);

  async function handleReset() {
    await reset();
    setOpen(false);
    toast.success('Demo sıfırlandı', { description: 'Rıza defteri başlangıç verisine döndürüldü.' });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">
          <RotateCcw className="size-4" />
          Demoyu sıfırla
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demoyu sıfırla?</AlertDialogTitle>
          <AlertDialogDescription>
            Bu tarayıcıdaki tüm rıza kayıtları silinir ve başlangıç (seed) verisi yeniden oluşturulur.
            Eklediğin onaylar/geri çekmeler kaybolur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>Sıfırla</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
