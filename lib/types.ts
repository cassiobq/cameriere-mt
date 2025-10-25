export interface Mesa {
  id: number
  created_at: number
  numero: number
  ativa: boolean
}

export interface Produto {
  id: number
  created_at: number
  nome: string
  preco_centavos: number
  ativo: boolean
  preparavel: boolean
}

export interface Comanda {
  id: number
  created_at: number
  aberta_em: number
  fechada_em?: number
  taxa_garcom: number
  desconto_centavos: number
  mesa_id: number
  cliente: string
  taxa_couvert: number
}

export interface ItemComanda {
  id: number
  created_at: number
  qtd: number
  obs: string
  preco_unit_centavos_snapshot: number
  natureza_snapshot: string
  impresso_cozinha: boolean
  comanda_id: number
  produto_id: number
}

export interface Pagamento {
  id: number
  created_at: number
  valor_centavos: number
  metodo: string
  registrado_em: number
  comanda_id: number
}

export interface MesaComComanda extends Mesa {
  comanda?: Comanda
  tem_comanda_aberta: boolean
}

export interface ItemComandaComProduto extends ItemComanda {
  produto?: Produto
}

export interface ComandaCompleta extends Comanda {
  itens: ItemComandaComProduto[]
}

export interface MostrarComandaResponse {
  comanda: Comanda
  mesa: Mesa
  itens: Array<{
    id: number
    qtd: number
    obs: string
    preco_unit_centavos_snapshot: number
    produto: Produto
  }>
  subtotal_centavos: number
  taxa_garcom_centavos: number
  taxa_couvert_centavos: number
  total_centavos: number
}

export interface AbrirComandaRequest {
  mesa_id: number
  cliente: string
  produtos: Array<{ produto_id: number }>
}

export interface PagamentoRequest {
  comanda_id: number
  metodo_pagamento: string
}
