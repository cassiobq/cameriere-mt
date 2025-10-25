// hooks/use-mesas.ts
"use client";

import useSWR from "swr";
import { mesasApi, type MesaComStatus } from "@/lib/api";

type UseMesas = {
  mesas: MesaComStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const REFRESH_MS = 5000; // ajuste se quiser

async function fetchMesas(): Promise<MesaComStatus[]> {
  const mesas = await mesasApi.listarMesas();
  const status = await Promise.all(
    mesas.map(async (m) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-comanda-by-mesa?mesa_id=${m.id}&fechada=false`);
      const data = await res.json();
      const ocupada = Array.isArray(data) && data.length > 0;
      return { ...m, ocupada, livre: !ocupada };
    })
  );
  return status;
}


export function useMesas(): UseMesas {
  const { data, error, isLoading, mutate } = useSWR<MesaComStatus[]>(
    "mesas-com-status",
    fetchMesas,
    { refreshInterval: REFRESH_MS, revalidateOnFocus: true }
  );

  return {
    mesas: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh: () => mutate(),
  };
}
