import useSWR from "swr"
import { produtosApi, type Produto } from "@/lib/api"

export function useProdutos() {
  const { data, error, isLoading } = useSWR<Produto[]>("/produto", produtosApi.listar, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const produtosAtivos = data?.filter((p) => p.ativo) || []

  return {
    produtos: produtosAtivos,
    isLoading,
    isError: error,
  }
}
