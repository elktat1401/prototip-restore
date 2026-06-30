'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, FileSignature, LayoutGrid, LogIn, ShieldCheck, UserCog } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MockBanner } from '@/components/mock-banner';
import { ResetDemoButton } from '@/components/reset-demo-button';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { href: '/', label: 'Genel Bakış', icon: LayoutGrid },
  { href: '/signup', label: 'Kayıt', icon: FileSignature },
  { href: '/checkout', label: 'Checkout', icon: CreditCard },
  { href: '/login', label: 'Giriş · Re-consent', icon: LogIn },
  { href: '/profile', label: 'Profil & İzinler', icon: UserCog },
  { href: '/ledger', label: 'Hash-Chain Defteri', icon: ShieldCheck }
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col">
      <MockBanner />
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
              <ShieldCheck className="size-4" />
            </span>
            <span>
              GitSec <span className="text-muted-foreground font-normal">Rıza Defteri</span>
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-2 md:w-auto md:flex-1">
            {NAV.map(item => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
            <ResetDemoButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="text-muted-foreground border-t px-4 py-4 text-center text-xs">
        GitSec · Rıza Saklama Prototipi · Katman 1.1 (Postgres snapshot) + 2.2 (temporal/history) + 3.1 (SHA-256
        hash-chain) · KVKK md.7 / GDPR Art.7
      </footer>
    </div>
  );
}
