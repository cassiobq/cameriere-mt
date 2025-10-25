import useSWR from "swr"
import { comandasApi, type MostrarComandaResponse } from "@/lib/api"

export function useComandaDetalhes(mesa_id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<MostrarComandaResponse>(
    mesa_id ? `/mostrar-comanda/${mesa_id}` : null,
    () => (mesa_id ? comandasApi.mostrar(mesa_id) : null),
    {
      revalidateOnFocus: true,
    },
  )

  return {
    comanda: data,
    isLoading,
    isError: error,
    mutate,
  }
}
