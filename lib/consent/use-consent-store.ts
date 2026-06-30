'use client';

/**
 * Reaktif rıza defteri store'u — artık BACKEND API'ye bağlıdır
 * (localStorage değil). Tüm ekranlar aynı modül-seviyesi snapshot'a bakar;
 * bir mutasyon sonrası defter yeniden çekilir ve tüm bileşenler güncellenir.
 *
 * Public arayüz değişmedi (records, ready, appendEvents, grant, withdraw,
 * tamper, reset) → bileşenler aynı kaldı.
 */

import { useSyncExternalStore } from 'react';

import { type ConsentEventInput } from './store';
import { type ConsentRecord } from './types';

const EMPTY: ConsentRecord[] = [];
let snapshot: ConsentRecord[] = EMPTY;
let initialized = false;
let initPromise: Promise<void> | null = null;
let initAttempts = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function setRecords(records: ConsentRecord[]): void {
  snapshot = records;
  emit();
}

async function fetchLedger(): Promise<ConsentRecord[]> {
  const res = await fetch('/api/consent/ledger', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Defter alınamadı (${res.status})`);
  const data = await res.json();
  return (data.records ?? []) as ConsentRecord[];
}

function ensureInitialized(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const records = await fetchLedger();
    snapshot = records;
    initialized = true;
    emit();
  })().catch(err => {
    // Hata olursa initPromise'i bırak; geçici hatalarda kısa süre sonra otomatik tekrar dene
    // (ör. sunucu/DB ilk açılışta hazır değilse UI kalıcı "Yükleniyor"da takılmasın).
    initPromise = null;
    console.error('[consent] ilk yükleme hatası:', err);
    if (++initAttempts < 8 && typeof window !== 'undefined') {
      setTimeout(() => void ensureInitialized(), 1500);
    }
  });
  return initPromise;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureInitialized();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ConsentRecord[] {
  return snapshot;
}

function getServerSnapshot(): ConsentRecord[] {
  return EMPTY;
}

// --- actions (modül-seviyesi, stabil referanslar) ---

async function appendEventsAction(inputs: ConsentEventInput[]): Promise<ConsentRecord[]> {
  await ensureInitialized();
  const res = await fetch('/api/consent/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ events: inputs })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Olay eklenemedi (${res.status})`);
  }
  const fresh = await fetchLedger();
  setRecords(fresh);
  return fresh;
}

async function grant(input: Omit<ConsentEventInput, 'action'>): Promise<ConsentRecord[]> {
  return appendEventsAction([{ ...input, action: 'GRANTED' }]);
}

async function withdraw(input: Omit<ConsentEventInput, 'action'>): Promise<ConsentRecord[]> {
  return appendEventsAction([{ ...input, action: 'WITHDRAWN' }]);
}

async function tamper(id: string, field: keyof ConsentRecord, value: string): Promise<void> {
  await fetch('/api/consent/tamper', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, field, value })
  });
  setRecords(await fetchLedger());
}

async function reset(): Promise<void> {
  await fetch('/api/consent/reset', { method: 'POST' });
  setRecords(await fetchLedger());
}

export interface ConsentStore {
  records: ConsentRecord[];
  ready: boolean;
  appendEvents: typeof appendEventsAction;
  grant: typeof grant;
  withdraw: typeof withdraw;
  tamper: typeof tamper;
  reset: typeof reset;
}

export function useConsentStore(): ConsentStore {
  const records = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    records,
    ready: initialized,
    appendEvents: appendEventsAction,
    grant,
    withdraw,
    tamper,
    reset
  };
}
