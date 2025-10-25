// hooks/use-mesas.ts
"use client";

import useSWR from "swr";
import { mesasApi } from "@/lib/api";

type Mesa = {
  id: number;
  numero: number;
  ativa: boolean;
  ocupada: boolean;
  livre: boolean;
};

type UseMesas = {
  mesas: Mesa[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

// ✅ FIX DEFINITIVO: DESABILITAR auto-refresh
// Usuário recarrega manualmente clicando no botão de refresh
const REFRESH_MS = 0; // Desabilitado

async function fetchMesas(): Promise<Mesa[]> {
  try {
    console.log("[useMesas] Iniciando busca...");
    const startTime = Date.now();
    
    const mesas = await mesasApi.listarMesas();
    console.log(`[useMesas] ${mesas.length} mesas encontradas`);
    
    const mesasComStatus = await Promise.all(
      mesas.map(async (mesa) => {
        try {
          const abertas = await mesasApi.verificarComandaAberta(mesa.id);
          const ocupada = Array.isArray(abertas) && abertas.length > 0;
          
          return {
            ...mesa,
            ocupada,
            livre: !ocupada,
          };
        } catch (err: any) {
          if (err?.response?.status === 429) {
            console.warn(`[useMesas] Rate limit atingido para mesa ${mesa.id}`);
          }
          
          return {
            ...mesa,
            ocupada: false,
            livre: true,
          };
        }
      })
    );

    const elapsed = Date.now() - startTime;
    console.log(`[useMesas] Status carregado em ${elapsed}ms`);
    return mesasComStatus;
  } catch (err: any) {
    console.error("[useMesas] Erro ao buscar mesas:", err);
    throw err;
  }
}

export function useMesas(): UseMesas {
  const { data, error, isLoading, mutate } = useSWR<Mesa[]>(
    "mesas-com-status",
    fetchMesas,
    { 
      refreshInterval: REFRESH_MS, // ✅ Desabilitado (0)
      revalidateOnFocus: false, // ✅ Não recarregar ao focar
      revalidateOnReconnect: false, // ✅ Não recarregar ao reconectar
      dedupingInterval: 10000, // ✅ Cache de 10s
      onError: (err) => {
        console.error("[useMesas] SWR error:", err);
      }
    }
  );

  return {
    mesas: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh: () => {
      console.log("[useMesas] Refresh manual solicitado");
      mutate();
    },
  };
}
