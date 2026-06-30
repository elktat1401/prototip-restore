'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { shortHash } from '@/lib/consent/hash-chain';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function HashValue({
  value,
  full = false,
  tone = 'default',
  className
}: {
  value: string;
  full?: boolean;
  tone?: 'default' | 'ok' | 'broken';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard erişimi yoksa sessizce geç */
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copy}
          className={cn(
            'hash-mono inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors',
            tone === 'ok' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            tone === 'broken' && 'bg-destructive/10 text-destructive',
            tone === 'default' && 'bg-muted hover:bg-muted/70',
            className
          )}
        >
          <span className={cn(!full && 'truncate')}>{full ? value : shortHash(value)}</span>
          {copied ? <Check className="size-3 shrink-0 text-emerald-500" /> : <Copy className="size-3 shrink-0 opacity-40" />}
        </button>
      </TooltipTrigger>
      <TooltipContent className="hash-mono max-w-[90vw] break-all">{value}</TooltipContent>
    </Tooltip>
  );
}
