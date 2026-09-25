import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

export interface Lookups {
  courses: any[];
  batches: any[];
  academicYears: any[];
  feePeriods: any[];
  feeHeads: any[];
  paymentModes: any[];
  statuses: { Category: string; StatusCode: string; StatusName: string }[];
  consultants: any[];
  college: { name: string; address: string; phone: string; logoUrl: string };
  settings: Record<string, string>;
}

const Ctx = createContext<{ lookups: Lookups | null; reload: () => Promise<void> }>({ lookups: null, reload: async () => undefined });
export const useLookups = () => useContext(Ctx);

export function LookupsProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const reload = useCallback(async () => {
    try {
      setLookups(await api.get<Lookups>('/masters/lookups'));
    } catch {
      /* user may lack permission; pages degrade gracefully */
    }
  }, []);
  useEffect(() => {
    if (me && !me.mustChangePassword) reload();
  }, [me, reload]);
  return <Ctx.Provider value={{ lookups, reload }}>{children}</Ctx.Provider>;
}

export function statusOptions(l: Lookups | null, category: string) {
  return (l?.statuses ?? []).filter((s) => s.Category === category).map((s) => ({ value: s.StatusCode, label: s.StatusName }));
}
