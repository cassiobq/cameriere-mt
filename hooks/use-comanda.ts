// hooks/use-comanda.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listarMesas,
  verificarComandaAberta,
  mostrarComandaPorMesa,
  abrirComanda,
  listarProdutos,
  adicionarItem as apiAdicionarItem,
  editarItem as apiEditarItem,
  deletarItem as apiDeletarItem,
  registrarPagamento,
  patchComanda,
  type Mesa,
  type Produto,
  type ItemComanda,
  type Comanda,
} from "@/lib/api";

/**
 * Tipos tolerantes ao payload de /mostrar-comanda (Xano pode variar).
 */
export type CupomItem = {
  id?: number;
  produto_id?: number;
  nome?: string;
  qtd?: number;
  preco_unit_centavos?: number;
  total_centavos?: number;
  // Fallbacks baseados no snapshot:
  preco_unit_centavos_snapshot?: number;
  natureza_snapshot?: string;
};

export type Cupom = {
  comanda?: Partial<Comanda>;
  itens?: CupomItem[];
  subtotal_centavos?: number;
  taxa_garcom_percent?: number;
  taxa_couvert_centavos?: number;
  total_centavos?: number;
};

type ViewState = "idle" | "mesas" | "abrir" | "comanda";

export type UseComanda = {
  // dados
  mesas: Mesa[];
  produtos: Produto[];
  cupom: Cupom | null;
  comandaId: number | null;
  mesaSelecionada: Mesa | null;

  // ui
  view: ViewState;
  loading: boolean;
  error: string | null;

  // totais (preview)
  subtotalPreview: number;
  garcomPreview: number;
  couvertPreview: number;
  totalPreview: number;

  // ações
  recarregarMesas: () => Promise<void>;
  selecionarMesa: (mesa: Mesa) => Promise<void>;

  abrir: (params: { cliente?: string; produtosPreSelecionados?: number[] }) => Promise<void>;
  recarregarComanda: () => Promise<void>;

  adicionarItem: (p: { comanda_id: number; produto_id: number; qtd: number; obs?: string }) => Promise<void>;
  editarItem: (item_id: number, patch: { qtd?: number; obs?: string; impresso_cozinha?: boolean }) => Promise<void>;
  deletarItem: (item_id: number) => Promise<void>;

  pagarEFechar: (p: { comanda_id: number; valorReais: number; metodo: string }) => Promise<void>;

  // util
  limparErro: () => void;
};

function cents(n: number | undefined | null): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}
function percent(n: number | undefined | null): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Calcula preview se a API não fornecer totais completos.
 * Regras: taxa_garcom em %, taxa_couvert em centavos (default 0).
 */
function calcPreview(cupom: Cupom | null): {
  subtotal: number;
  garcom: number;
  couvert: number;
  total: number;
} {
  if (!cupom) return { subtotal: 0, garcom: 0, couvert: 0, total: 0 };

  const hasAll =
    typeof cupom.subtotal_centavos === "number" &&
    typeof cupom.taxa_garcom_percent === "number" &&
    typeof cupom.taxa_couvert_centavos === "number" &&
    typeof cupom.total_centavos === "number";

  if (hasAll) {
    const subtotal = cents(cupom.subtotal_centavos);
    const garcom = Math.round(subtotal * percent(cupom.taxa_garcom_percent!) / 100);
    const couvert = cents(cupom.taxa_couvert_centavos);
    const total = cents(cupom.total_centavos);
    return { subtotal, garcom, couvert, total };
  }

  const itens = cupom.itens ?? [];
  const subtotal = itens.reduce((acc, it) => {
    const qtd = it.qtd ?? 0;
    const unit = cents(it.preco_unit_centavos) || cents(it.preco_unit_centavos_snapshot);
    const linha = cents(it.total_centavos) || Math.max(0, Math.round(qtd * unit));
    return acc + linha;
  }, 0);

  const taxaGarcom = percent(cupom.comanda?.taxa_garcom ?? cupom.taxa_garcom_percent ?? 10);
  const couvert = cents(cupom.comanda?.taxa_couvert ?? cupom.taxa_couvert_centavos ?? 0);

  const garcom = Math.round(subtotal * taxaGarcom / 100);
  const total = subtotal + garcom + couvert;
  return { subtotal, garcom, couvert, total };
}

/**
 * Hook principal: fluxo mesas → verificar → abrir/mostrar → itens → pagamento/fechar.
 */
export function useComanda(): UseComanda {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [view, setView] = useState<ViewState>("idle");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null);
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [comandaId, setComandaId] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const limparErro = useCallback(() => setError(null), []);

  const recarregarMesas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, p] = await Promise.all([listarMesas(), listarProdutos()]);
      setMesas(m);
      setProdutos(p);
      setView("mesas");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar mesas/produtos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregarMesas();
    return () => {
      abortRef.current?.abort();
    };
  }, [recarregarMesas]);

  const selecionarMesa = useCallback(async (mesa: Mesa) => {
    setLoading(true);
    setError(null);
    setMesaSelecionada(mesa);
    setCupom(null);
    setComandaId(null);
    try {
      const abertas = await verificarComandaAberta(mesa.id);
      if (abertas && abertas.length > 0) {
        const data = await mostrarComandaPorMesa(mesa.id);
        const cid =
          (data?.comanda?.id as number | undefined) ??
          (Array.isArray(abertas) ? abertas[0]?.id : null) ??
          null;
        setComandaId(cid ?? null);
        setCupom(data ?? null);
        setView("comanda");
      } else {
        setView("abrir");
      }
    } catch (e: any) {
      setError(e?.message ?? "Falha ao verificar/mostrar comanda");
      setView("mesas");
    } finally {
      setLoading(false);
    }
  }, []);

  const abrir = useCallback(
    async (params: { cliente?: string; produtosPreSelecionados?: number[] }) => {
      if (!mesaSelecionada) {
        setError("Selecione uma mesa primeiro");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const produtos = (params.produtosPreSelecionados ?? []).map((id) => ({ produto_id: id }));
        await abrirComanda({
          mesa_id: mesaSelecionada.id,
          cliente: (params.cliente ?? "").trim(),
          produtos,
        });

        const data = await mostrarComandaPorMesa(mesaSelecionada.id);
        const cid = (data?.comanda?.id as number | undefined) ?? null;
        setComandaId(cid);
        setCupom(data ?? null);
        setView("comanda");
      } catch (e: any) {
        setError(e?.message ?? "Falha ao abrir comanda");
      } finally {
        setLoading(false);
      }
    },
    [mesaSelecionada]
  );

  const recarregarComanda = useCallback(async () => {
    if (!mesaSelecionada) return;
    setLoading(true);
    setError(null);
    try {
      const data = await mostrarComandaPorMesa(mesaSelecionada.id);
      const cid = (data?.comanda?.id as number | undefined) ?? comandaId;
      setComandaId(cid ?? null);
      setCupom(data ?? null);
      setView("comanda");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao recarregar comanda");
    } finally {
      setLoading(false);
    }
  }, [mesaSelecionada, comandaId]);

  const adicionarItem = useCallback(
    async (p: { comanda_id: number; produto_id: number; qtd: number; obs?: string }) => {
      setLoading(true);
      setError(null);
      try {
        await apiAdicionarItem(p);
        await recarregarComanda();
      } catch (e: any) {
        setError(e?.message ?? "Falha ao adicionar item");
      } finally {
        setLoading(false);
      }
    },
    [recarregarComanda]
  );

  const editarItem = useCallback(
    async (item_id: number, patch: { qtd?: number; obs?: string; impresso_cozinha?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        await apiEditarItem(item_id, patch);
        await recarregarComanda();
      } catch (e: any) {
        setError(e?.message ?? "Falha ao editar item");
      } finally {
        setLoading(false);
      }
    },
    [recarregarComanda]
  );

  const deletarItem = useCallback(
    async (item_id: number) => {
      setLoading(true);
      setError(null);
      try {
        await apiDeletarItem(item_id);
        await recarregarComanda();
      } catch (e: any) {
        setError(e?.message ?? "Falha ao remover item");
      } finally {
        setLoading(false);
      }
    },
    [recarregarComanda]
  );

  const pagarEFechar = useCallback(
    async (p: { comanda_id: number; valorReais: number; metodo: string }) => {
      setLoading(true);
      setError(null);
      try {
        await registrarPagamento({
          comanda_id: p.comanda_id,
          valor_centavos: Math.round(p.valorReais * 100),
          metodo: p.metodo,
        });
        await patchComanda(p.comanda_id, { fechada: true });
        setCupom(null);
        setComandaId(null);
        setMesaSelecionada(null);
        await recarregarMesas();
      } catch (e: any) {
        setError(e?.message ?? "Falha ao pagar/fechar");
      } finally {
        setLoading(false);
      }
    },
    [recarregarMesas]
  );

  const { subtotal: subtotalPreview, garcom: garcomPreview, couvert: couvertPreview, total: totalPreview } =
    useMemo(() => calcPreview(cupom), [cupom]);

  return {
    mesas,
    produtos,
    cupom,
    comandaId,
    mesaSelecionada,

    view,
    loading,
    error,

    subtotalPreview,
    garcomPreview,
    couvertPreview,
    totalPreview,

    recarregarMesas,
    selecionarMesa,

    abrir,
    recarregarComanda,

    adicionarItem,
    editarItem,
    deletarItem,

    pagarEFechar,

    limparErro,
  };
}

/**
 * Alias solicitado pela sua base de código:
 * Exporta o mesmo comportamento do useComanda, para quem importa "useComandaDetalhes".
 */
export function useComandaDetalhes(): UseComanda {
  return useComanda();
}
