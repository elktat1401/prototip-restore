import Link from 'next/link';
import { CreditCard, Database, FileSignature, Fingerprint, History, LogIn, ShieldCheck, UserCog } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { LedgerSummary } from '@/components/consent/ledger-summary';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FLOWS = [
  {
    href: '/signup',
    icon: FileSignature,
    title: 'Kayıt — Onay Yakalama',
    desc: 'Freemium kaydında versiyon + zaman damgası + IP + yöntem ile loglanan onay. Pre-checked yasağı.',
    tags: ['1.1', '2.2', '3.1']
  },
  {
    href: '/checkout',
    icon: CreditCard,
    title: 'Checkout — Satın Alma Sözleşmeleri',
    desc: 'Ücretli plana geçişte Mesafeli Satış & Ön Bilgilendirme; signup’takine benzer onay akışı.',
    tags: ['1.1', '2.2', '3.1']
  },
  {
    href: '/login',
    icon: LogIn,
    title: 'Giriş — Yeniden Onay Bariyeri',
    desc: 'Sözleşme esaslı değişince (v1.0 → v2.0) girişte çıkan, geçilemez yeniden-onay modalı.',
    tags: ['1.1', '2.2']
  },
  {
    href: '/profile',
    icon: UserCog,
    title: 'Profil — Rızayı Geri Çekme',
    desc: 'Opt-out. Mevcut kayıt silinmeden, zincire yeni bir WITHDRAWN kaydı eklenir.',
    tags: ['2.2', '3.1']
  },
  {
    href: '/ledger',
    icon: ShieldCheck,
    title: 'Hash-Chain Defteri & Denetçi',
    desc: 'Canlı SHA-256 zinciri, doğrulama, kurcala→kırılma demosu ve temporal zaman-yolculuğu.',
    tags: ['2.2', '3.1']
  }
] as const;

const LAYERS = [
  {
    icon: Database,
    code: '1.1',
    title: 'Belge metni — Postgres snapshot',
    desc: 'Gösterilen metnin birebir kopyası, sürümlü append-only satır (policy_version).'
  },
  {
    icon: History,
    code: '2.2',
    title: 'Rıza kaydı — Temporal / history',
    desc: 'Append-only olaylar; “güncel durum” ve “T anındaki durum” türetilir (time-travel).'
  },
  {
    icon: Fingerprint,
    code: '3.1',
    title: 'Bütünlük — SHA-256 hash zinciri',
    desc: 'rowHash = SHA-256(prevHash ‖ canonical(alanlar+occurredAt)). Tamper-evidence.'
  }
] as const;

export default function HomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="GitSec — Rıza Saklama Prototipi"
        description="KVKK md.7 / GDPR Art.7 uyumlu, sürümlü ve geçmişe-dönük-kanıtlanabilir rıza saklama. Backend yok; tüm akışlar tarayıcıda çalışır ve aynı hash-chain defterine yazar."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {LAYERS.map(l => {
          const Icon = l.icon;
          return (
            <Card key={l.code}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-md">
                    <Icon className="size-4" />
                  </span>
                  <Badge variant="secondary" className="hash-mono">
                    Katman {l.code}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-base">{l.title}</CardTitle>
                <CardDescription>{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <LedgerSummary />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Akışlar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FLOWS.map(f => {
            const Icon = f.icon;
            return (
              <Link key={f.href} href={f.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                        <Icon className="size-5" />
                      </span>
                      <div className="flex gap-1">
                        {f.tags.map(t => (
                          <Badge key={t} variant="outline" className="hash-mono text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardTitle className="mt-2 text-base">{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
