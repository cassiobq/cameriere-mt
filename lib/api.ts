import axios from "axios"
import type { Mesa, Produto, Comanda, MostrarComandaResponse, AbrirComandaRequest, ItemComanda } from "./types"

const baseURL = process.env.NEXT_PUBLIC_XANO_URL || "https://x8ki-letl-twmt.n7.xano.io/api:T8k8gPUu"

console.log("[v0] API baseURL:", baseURL)

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(
  (config) => {
    console.log("[v0] API Request:", config.method?.toUpperCase(), config.url, config.data)
    return config
  },
  (error) => {
    console.error("[v0] API Request Error:", error)
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    console.log("[v0] API Response:", response.config.url, response.status, response.data)
    return response
  },
  (error) => {
    console.error("[v0] API Response Error:", error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)

export const mesasApi = {
  listar: async (): Promise<Mesa[]> => {
    const response = await api.get<Mesa[]>("/mesa")
    return response.data
  },
}

export const produtosApi = {
  listar: async (): Promise<Produto[]> => {
    const response = await api.get<Produto[]>("/produto")
    return response.data
  },
}

export const comandasApi = {
  verificarComandaAberta: async (mesa_id: number): Promise<Comanda | null> => {
    const response = await api.get<Comanda[]>("/get-comanda-by-mesa", {
      params: { mesa_id, fechada: false },
    })
    return response.data.length > 0 ? response.data[0] : null
  },

  mostrar: async (mesa_id: number): Promise<MostrarComandaResponse> => {
    const response = await api.post<MostrarComandaResponse>("/mostrar-comanda", { mesa_id })
    return response.data
  },

  abrir: async (data: AbrirComandaRequest): Promise<Comanda> => {
    const response = await api.post<Comanda>("/abrir-comanda", data)
    return response.data
  },

  fechar: async (comanda_id: number): Promise<void> => {
    await api.patch(`/comanda/${comanda_id}`, { fechada_em: Date.now() })
  },
}

export const itensComandaApi = {
  adicionar: async (data: { comanda_id: number; produto_id: number; qtd: number }): Promise<ItemComanda> => {
    const response = await api.post<ItemComanda>("/item_comanda", data)
    return response.data
  },

  remover: async (item_id: number): Promise<void> => {
    await api.delete(`/item_comanda/${item_id}`)
  },
}

export const pagamentosApi = {
  registrar: async (data: { valor_centavos: number; metodo: string; comanda_id: number }): Promise<void> => {
    await api.post("/pagamento", data)
  },
}

export default api
