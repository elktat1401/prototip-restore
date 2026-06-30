'use client';

/**
 * Reaktif rıza defteri store'u (useSyncExternalStore tabanlı).
 * Tüm ekranlar aynı modül-seviyesi zincire bakar; bir ekrandaki ekleme/geri
 * çekme/kurcalama anında diğerlerine yansır.
 */

import { useSyncExternalStore } from 'react';

import { type ConsentRecord } from './types';
import {
  appendEvents,
  buildSeedRecords,
  clearRecords,
  type ConsentEventInput,
  loadRecords,
  saveRecords,
  tamperField
} from './store';

const EMPTY: ConsentRecord[] = [];
let snapshot: ConsentRecord[] = EMPTY;
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function commit(records: ConsentRecord[]): void {
  snapshot = records;
  saveRecords(records);
  emit();
}

function ensureInitialized(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const existing = loadRecords();
    if (existing.length > 0) {
      snapshot = existing;
    } else {
      const seeded = await buildSeedRecords();
      snapshot = seeded;
      saveRecords(seeded);
    }
    initialized = true;
    emit();
  })();
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
  const next = await appendEvents(snapshot, inputs);
  commit(next);
  return next;
}

async function grant(input: Omit<ConsentEventInput, 'action'>): Promise<ConsentRecord[]> {
  return appendEventsAction([{ ...input, action: 'GRANTED' }]);
}

async function withdraw(input: Omit<ConsentEventInput, 'action'>): Promise<ConsentRecord[]> {
  return appendEventsAction([{ ...input, action: 'WITHDRAWN' }]);
}

function tamper(id: string, field: keyof ConsentRecord, value: string): void {
  commit(tamperField(snapshot, id, field, value));
}

async function reset(): Promise<void> {
  clearRecords();
  initialized = false;
  initPromise = null;
  snapshot = EMPTY;
  emit();
  await ensureInitialized();
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
