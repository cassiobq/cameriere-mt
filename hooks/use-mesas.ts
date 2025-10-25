import useSWR from "swr"
import { mesasApi, comandasApi, type Mesa } from "@/lib/api"

export function useMesas() {
  const { data, error, isLoading, mutate } = useSWR<Mesa[]>(
    "/mesa",
    async () => {
      console.log("[v0] Fetching mesas...")
      try {
        const result = await mesasApi.listar()
        console.log("[v0] Mesas response:", result)
        return result.filter((mesa) => mesa.ativa)
      } catch (err) {
        console.error("[v0] Error fetching mesas:", err)
        throw err
      }
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      onError: (err) => {
        console.error("[v0] SWR error:", err)
      },
    },
  )

  return {
    mesas: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export async function verificarComandaAberta(mesa_id: number) {
  return await comandasApi.verificarComandaAberta(mesa_id)
}
