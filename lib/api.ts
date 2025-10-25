// lib/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

/** =================== Config =================== **/
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL ausente no .env");
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function asApiError(err: unknown): Error {
  const e = err as AxiosError<any>;
  const status = e.response?.status;
  const data = e.response?.data;
  const msg = `[api] ${e.config?.method?.toUpperCase()} ${e.config?.url} -> ${status ?? "ERR"} ${
    typeof data === "string" ? data : JSON.stringify(data)
  }`;
  return new Error(msg);
}

/** =================== Tipos =================== **/
export type Mesa = { id: number; numero: number; ativa: boolean };
export type MesaComStatus = Mesa & { ocupada: boolean; livre: boolean };

export type Produto = {
  id: number;
  nome: string;
  preco_centavos: number;
  ativo: boolean;
  preparavel?: boolean;
};

export type ItemComanda = {
  id: number;
  comanda_id: number;
  produto_id: number;
  qtd: number;
  obs?: string;
  preco_unit_centavos_snapshot: number;
  natureza_snapshot?: string;
  impresso_cozinha?: boolean;
};

export type Comanda = {
  id: number;
  mesa_id: number;
  cliente?: string;
  taxa_garcom: number;   // percentual inteiro (ex.: 10)
  taxa_couvert: number;  // centavos (padrão 0)
  desconto_centavos?: number;
  fechada: boolean;
};

export type Pagamento = {
  id: number;
  comanda_id: number;
  valor_centavos: number;
  metodo: string;
  registrado_em: number; // timestamptz numérico
};

type Id = number;

/** =================== Mesas =================== **/
export async function listarMesas(): Promise<Mesa[]> {
  try {
    const r = await api.get("/mesa");
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

/**
 * Status da mesa = existência de comanda aberta (fechada=false).
 * Se tem comanda aberta -> ocupada=true / livre=false
 * Se NÃO tem comanda aberta -> ocupada=false / livre=true
 */
export async function listarMesasComStatus(): Promise<MesaComStatus[]> {
  const mesas = await listarMesas();
  // N+1 simples (suficiente pro MVP). Se virar gargalo, criar endpoint batch no Xano.
  const results = await Promise.all(
    mesas.map(async (m) => {
      try {
        const r = await api.get("/get-comanda-by-mesa", { params: { mesa_id: m.id, fechada: false } });
        const abertas = Array.isArray(r.data) ? r.data : [];
        const ocupada = abertas.length > 0;
        return { ...m, ocupada, livre: !ocupada };
      } catch {
        // Se a checagem falhar, trate como livre para não travar a UI
        return { ...m, ocupada: false, livre: true };
      }
    })
  );
  return results;
}

/** =================== Comandas (consulta/abertura) =================== **/
export async function verificarComandaAberta(mesa_id: Id): Promise<Comanda[]> {
  try {
    const r = await api.get("/get-comanda-by-mesa", { params: { mesa_id, fechada: false } });
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

export async function mostrarComandaPorMesa(mesa_id: Id): Promise<any> {
  try {
    const r = await api.post("/mostrar-comanda", { mesa_id });
    return r.data; // estrutura aberta pelo Xano
  } catch (err) {
    throw asApiError(err);
  }
}

export async function abrirComanda(input: {
  mesa_id: Id;
  cliente?: string;
  produtos: { produto_id: Id }[];
}): Promise<any> {
  try {
    const body = {
      mesa_id: input.mesa_id,
      cliente: (input.cliente ?? "").trim(),
      produtos: input.produtos,
    };
    const r = await api.post("/abrir-comanda", body);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

/** =================== Produtos =================== **/
export async function listarProdutos(): Promise<Produto[]> {
  try {
    const r = await api.get("/produto");
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

/** =================== Itens =================== **/
export async function adicionarItem(input: {
  comanda_id: Id;
  produto_id: Id;
  qtd: number;
  obs?: string;
}): Promise<ItemComanda> {
  try {
    const r = await api.post("/item_comanda", input);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

export async function editarItem(
  item_id: Id,
  patch: Partial<Pick<ItemComanda, "qtd" | "obs" | "impresso_cozinha">>
): Promise<ItemComanda> {
  try {
    const r = await api.patch(`/item_comanda/${item_id}`, patch);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

export async function deletarItem(item_id: Id): Promise<void> {
  try {
    await api.delete(`/item_comanda/${item_id}`);
  } catch (err) {
    throw asApiError(err);
  }
}

/** =================== Comanda CRUD/Fechamento =================== **/
export async function getComanda(comanda_id: Id): Promise<Comanda> {
  try {
    const r = await api.get(`/comanda/${comanda_id}`);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

export async function patchComanda(
  comanda_id: Id,
  patch: Partial<Pick<Comanda, "cliente" | "mesa_id" | "taxa_garcom" | "taxa_couvert" | "desconto_centavos" | "fechada">>
): Promise<Comanda> {
  try {
    const r = await api.patch(`/comanda/${comanda_id}`, patch);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

/** =================== Pagamento =================== **/
export async function registrarPagamento(input: {
  comanda_id: Id;
  valor_centavos: number;
  metodo: string;
}): Promise<Pagamento> {
  try {
    const r = await api.post("/pagamento", input);
    return r.data;
  } catch (err) {
    throw asApiError(err);
  }
}

/** =================== Helpers de fluxo =================== **/
export async function onMesaClick(mesa_id: Id) {
  const abertas = await verificarComandaAberta(mesa_id);
  if (abertas?.length > 0) {
    return await mostrarComandaPorMesa(mesa_id);
  }
  return null; // mesa livre → abrir modal
}

export async function onAbrirComandaEExibir(params: { mesa_id: Id; cliente?: string; preSelecionados: Id[] }) {
  await abrirComanda({
    mesa_id: params.mesa_id,
    cliente: params.cliente,
    produtos: params.preSelecionados.map((id) => ({ produto_id: id })),
  });
  return await mostrarComandaPorMesa(params.mesa_id);
}

export async function onFecharComanda(params: { comanda_id: Id; valorReais: number; metodo: string }) {
  await registrarPagamento({
    comanda_id: params.comanda_id,
    valor_centavos: Math.round(params.valorReais * 100),
    metodo: params.metodo,
  });
  await patchComanda(params.comanda_id, { fechada: true });
}

/** =================== Exports agrupados (compat) =================== **/
export const comandasApi = {
  // CRUD/fluxo
  verificarComandaAberta,
  mostrarComandaPorMesa,
  abrirComanda,
  listarProdutos,
  adicionarItem,
  editarItem,
  deletarItem,
  getComanda,
  patchComanda,
  registrarPagamento,
  onMesaClick,
  onAbrirComandaEExibir,
  onFecharComanda,

  // mesas também expostas aqui (muita base importa tudo por aqui)
  listarMesas,
  listarMesasComStatus,

  // aliases de compatibilidade
  listar: listarMesas,
  abrir: abrirComanda, // 👈 resolve `comandasApi.abrir is not a function`
};

export const mesasApi = {
  listarMesas,
  listarMesasComStatus,
  verificarComandaAberta,
  mostrarComandaPorMesa,
  abrirComanda,

  // aliases
  listar: listarMesas,
};

export const produtosApi = {
  listarProdutos,
  listar: listarProdutos,
};

export const itensComandaApi = {
  adicionarItem,
  editarItem,
  deletarItem,
  // alias neutro (evita quebra em chamadas genéricas .listar())
  listar: listarProdutos,
};
