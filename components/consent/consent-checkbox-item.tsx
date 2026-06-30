'use client';

import { type DocumentVersion } from '@/lib/consent/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LegalDocumentDialog } from '@/components/consent/legal-document';

export function ConsentCheckboxItem({
  id,
  doc,
  label,
  checked,
  onCheckedChange,
  required
}: {
  id: string;
  doc: DocumentVersion;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required: boolean;
}) {
  return (
    <div className="hover:bg-accent/40 flex items-start gap-3 rounded-lg border p-3 transition-colors">
      {/* Pre-checked DEĞİL — kullanıcı kutucuğa kendisi tıklamalı (KVKK/GDPR). */}
      <Checkbox id={id} checked={checked} onCheckedChange={v => onCheckedChange(Boolean(v))} className="mt-0.5" />
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm leading-snug font-normal">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hash-mono text-[10px]">
            {doc.version}
          </Badge>
          <LegalDocumentDialog doc={doc}>
            <button type="button" className="text-primary text-xs underline-offset-2 hover:underline">
              Metni oku
            </button>
          </LegalDocumentDialog>
          {!required && <span className="text-muted-foreground text-[11px]">isteğe bağlı</span>}
        </div>
      </div>
    </div>
  );
}
