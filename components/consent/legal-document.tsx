'use client';

import { type DocumentVersion } from '@/lib/consent/types';
import { formatDateOnly } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

/** Çok hafif markdown render — react-markdown bağımlılığı olmadan. */
export function MarkdownLite({ body }: { body: string }) {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="text-muted-foreground my-2 list-disc space-y-1 pl-5 text-sm">
          {list.map((li, i) => (
            <li key={i}>{clean(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      flushList();
      blocks.push(
        <h3 key={key++} className="mt-4 text-base font-semibold first:mt-0">
          {clean(line.slice(2))}
        </h3>
      );
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="text-muted-foreground my-1.5 text-sm leading-relaxed">
          {clean(line)}
        </p>
      );
    }
  }
  flushList();
  return <div>{blocks}</div>;
}

function clean(s: string): string {
  // *(YENİ)* / **kalın** gibi vurgu işaretlerini sadeleştir.
  return s.replace(/\*+/g, '');
}

export function DocumentMeta({ doc }: { doc: DocumentVersion }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="font-mono">
        {doc.version}
      </Badge>
      <span className="text-muted-foreground text-xs">Yürürlük: {formatDateOnly(doc.effectiveDate)}</span>
      {doc.materiality === 'material' && (
        <Badge variant="outline" className="text-xs">
          Esaslı metin
        </Badge>
      )}
    </div>
  );
}

export function LegalDocumentDialog({
  doc,
  children
}: {
  doc: DocumentVersion;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription asChild>
            <div>
              <DocumentMeta doc={doc} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <MarkdownLite body={doc.body} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
