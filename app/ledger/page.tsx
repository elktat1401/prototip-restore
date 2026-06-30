import { PageHeader } from '@/components/page-header';
import { HashChainExplorer } from '@/components/consent/hash-chain-explorer';
import { TemporalView } from '@/components/consent/temporal-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hash-Chain Defteri & Denetçi Görünümü"
        description="Tüm rıza olaylarının değişmez, hash-zincirli kaydı. Canlı SHA-256 doğrulaması, kurcala→kırılma demosu ve “şu tarihte rıza neydi?” temporal sorgusu."
      />

      <Tabs defaultValue="chain">
        <TabsList>
          <TabsTrigger value="chain">Hash Zinciri (3.1)</TabsTrigger>
          <TabsTrigger value="temporal">Zaman Yolculuğu (2.2)</TabsTrigger>
        </TabsList>
        <TabsContent value="chain" className="mt-4">
          <HashChainExplorer />
        </TabsContent>
        <TabsContent value="temporal" className="mt-4">
          <TemporalView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
