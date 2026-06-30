import { FlaskConical } from 'lucide-react';

export function MockBanner() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-700 dark:text-amber-400">
      <FlaskConical className="size-3.5 shrink-0" />
      <span>
        <strong>Prototip:</strong> Backend yoktur. Tüm rıza kayıtları yalnızca bu tarayıcıda (localStorage)
        saklanır, hash'ler tarayıcıda (Web Crypto SHA-256) hesaplanır.
      </span>
    </div>
  );
}
