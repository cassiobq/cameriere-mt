PRD — Cameriere MT (UI de Mesas & Comandas)

Base: Next.js App Router + TS + shadcn/ui
Back-end: API Xano (apispec_T8k8gPUu.json)
Princípios: I/O puro. Fonte da verdade = API. Preview de totais apenas visual. taxa_garçom=10% (vem da base). taxa_couvert=0 por padrão (só muda via PATCH comanda).

1) Objetivo & KPI

Abrir/editar/fechar comanda por mesa com latência percebida baixa.

KPIs: abrir comanda ≤10s; busca produtos ≤300ms; erro 4xx/5xx <1%.

2) Matriz “Fluxo UI” × “Endpoints”
Etapa	Tela/Tipo	Objetivo	Endpoint	Método	I/O essencial
tela_inicial	page	Listar mesas com status	/mesa	GET	—
verificar_comanda	logic	Checar comanda aberta	/get-comanda-by-mesa?mesa_id={id}&fechada=false	GET	Query: mesa_id, fechada=false → [] (vazia) ou [{comanda}]
mostrar_comanda	page	Exibir cupom fiscal	/mostrar-comanda	POST	Body: { mesa_id } → itens + cabeçalho comanda
deletar_item	action	Remover item	/item_comanda/{item_id}	DELETE	path
abrir_modal_item	modal	Adicionar item	/produto	GET	—
onSubmit adicionar item	action	Persistir item	/item_comanda	POST	{ comanda_id, produto_id, qtd, obs? }
fechar_comanda → fluxo_pagamento	modal	Registrar pagamento	/pagamento	POST	{ comanda_id, valor_centavos, metodo }
fechamento	action	Fechar a comanda	/comanda/{id}	PATCH	{ fechada: true }
criar_comanda	page	Preparar abertura	—	—	Captura cliente
lancar_produtos	page	Pré-selecionar itens	/produto	GET	—
abrir_comanda	action	Abrir comanda	/abrir-comanda	POST	{ mesa_id, cliente, produtos:[{produto_id}] }
voltar à comanda	nav	Exibir cupom	/mostrar-comanda	POST	{ mesa_id }
3) Modelo de Dados (UI)

Mesa: { id:int, numero:int, ativa:boolean }

Comanda: { id:int, mesa_id:int, cliente?:string, taxa_garcom:int(%)=10, taxa_couvert:int(centavos)=0, desconto_centavos?:int, fechada:boolean }

Item: { id:int, comanda_id:int, produto_id:int, qtd:int, obs?:string, preco_unit_centavos_snapshot:int, natureza_snapshot?:string, impresso_cozinha?:boolean }

Produto: { id:int, nome:string, preco_centavos:int, ativo:boolean, preparavel?:boolean }

Pagamento: { id:int, comanda_id:int, valor_centavos:int, metodo:string, registrado_em:number(timestamptz) }

4) Regras de Negócio (fechadas com a API)

Taxas: taxa_garcom=10 (percentual) vem da API; taxa_couvert inicia 0 e só muda via PATCH na comanda.

Exclusividade: 1 comanda aberta por mesa.

Fechamento: fechada:true torna itens imutáveis; UI esconde/disable ações.

Quantidade: qtd inteira ≥1.

Snapshot: preço/natureza ficam no item (imunes a mudanças no catálogo).

Pagamento: sempre atrelado a comanda_id; fechar após registrar pagamento(s).

5) Máquina de Estados (Front)

Mesas/List → click mesa → VerificarComanda

Se GET /get-comanda-by-mesa … fechada=false retornar >0 → ComandaAberta(mostrar_comanda)

Senão → CriarComanda

CriarComanda → LancarProdutos (lista local) → POST /abrir-comanda → ComandaAberta

ComandaAberta:

POST /mostrar-comanda (hydrate)

AdicionarItem → GET /produto → POST /item_comanda → refresh

ExcluirItem → DELETE /item_comanda/{id} → refresh

Fechar → Pagamento → POST /pagamento → PATCH /comanda/{id} {fechada:true} → Mesas/List

6) UX/Telas (essência)

Mesas: grid de cards (numero, ativa). Card inativo é desabilitado.

Cupom Fiscal: lista itens com nome, qtd, preço unitário, total linha, ícone 🗑. Rodapé com subtotal, taxa_garçom (preview), couvert (0), total. Botões: Fechar comanda (danger), Adicionar item (FAB).

Modal “Adicionar produto”: select de produto + qtd (1 default).

Pagamento: select {dinheiro,pix,cartao} + valor em reais (UI converte p/ centavos).

7) Contratos (payloads prontos)

Abrir comanda

POST /abrir-comanda
{ "mesa_id": 12, "cliente": "João", "produtos": [ { "produto_id": 101 }, { "produto_id": 203 } ] }


Mostrar comanda

POST /mostrar-comanda
{ "mesa_id": 12 }


Adicionar item

POST /item_comanda
{ "comanda_id": 555, "produto_id": 203, "qtd": 2, "obs": "Pouco sal" }


Excluir item

DELETE /item_comanda/9876


Registrar pagamento e fechar

POST /pagamento
{ "comanda_id": 555, "valor_centavos": 4500, "metodo": "pix" }

PATCH /comanda/555
{ "fechada": true }


Listar mesas

GET /mesa


Checar comanda aberta

GET /get-comanda-by-mesa?mesa_id=12&fechada=false

8) Cálculo de totais (UI — preview)

subtotal_ui = Σ (qtd * preco_unit_centavos_snapshot)

garcom_ui = round(subtotal_ui * (taxa_garcom/100))

couvert_ui = taxa_couvert (por padrão 0)

total_ui = subtotal_ui + garcom_ui + couvert_ui

Oficial: quando a API devolver totais, prevalecem os da API.

9) Erros & Resiliência
Caso	Tratamento
400 input inválido	destacar campo e tooltip com mensagem da API
404 mesa/comanda/item	refresh da tela relevante; toast com ação “recarregar”
409 comanda já aberta	redirecionar direto para mostrar_comanda
429/5xx	retry com backoff (300/600/1200ms) + botão “tentar de novo”
Timeout	mostrar estado “instável”, permitir reenviar
10) Telemetria (eventos)

mesas_loaded (count, RTT)

check_comanda (mesa_id, hasOpen:boolean, RTT)

open_comanda_ok/fail (mesa_id, RTT)

add_item_ok/fail (produto_id, qtd, RTT)

delete_item_ok/fail (item_id, RTT)

payment_recorded (valor, metodo)

close_comanda_ok (comanda_id, total_preview, RTT)

11) Critérios de Aceite (por etapa)

Mesas: listar ≥50 mesas em ≤500ms; cards inativos desabilitados.

Verificação: decidir rota (mostrar_comanda vs criar_comanda) em ≤300ms após clique.

Abrir comanda: 200 em /abrir-comanda e mostrar_comanda renderizada em ≤1s.

Itens: adicionar/remover reflete no cupom imediatamente após 200.

Pagamento + Fechamento: dois passos concluídos sem erro e redireciono para Mesas.

Couvert padrão: 0 em novas comandas; só muda via PATCH.

12) Tipos TS (client) — essenciais
export type Mesa = { id: number; numero: number; ativa: boolean };
export type Produto = { id: number; nome: string; preco_centavos: number; ativo: boolean; preparavel?: boolean };
export type ItemComanda = {
  id: number; comanda_id: number; produto_id: number; qtd: number; obs?: string;
  preco_unit_centavos_snapshot: number; natureza_snapshot?: string; impresso_cozinha?: boolean;
};
export type Comanda = {
  id: number; mesa_id: number; cliente?: string; taxa_garcom: number; taxa_couvert: number;
  desconto_centavos?: number; fechada: boolean;
};
export type Pagamento = { id: number; comanda_id: number; valor_centavos: number; metodo: string; registrado_em: number };

13) Pseudocódigo (core do fluxo)
// click mesa
async function onMesaClick(mesa: Mesa) {
  const r = await GET(`/get-comanda-by-mesa?mesa_id=${mesa.id}&fechada=false`);
  if (r.ok && r.json.length > 0) gotoMostrarComanda(mesa);
  else gotoCriarComanda(mesa);
}

// abrir comanda
async function abrirComanda(mesa_id: number, cliente: string, preSelecionados: number[]) {
  await POST('/abrir-comanda', { mesa_id, cliente, produtos: preSelecionados.map(id => ({ produto_id: id })) });
  gotoMostrarComanda({ id: mesa_id } as Mesa);
}

// mostrar comanda
async function hydrateComanda(mesa_id: number) {
  const data = await POST('/mostrar-comanda', { mesa_id });
  setComanda(data); // inclui itens, taxas etc.
}

// adicionar item
async function addItem(comanda_id: number, produto_id: number, qtd: number) {
  await POST('/item_comanda', { comanda_id, produto_id, qtd });
  await hydrateComanda(currentMesaId);
}

// excluir item
async function deleteItem(item_id: number) {
  await DELETE(`/item_comanda/${item_id}`);
  await hydrateComanda(currentMesaId);
}

// pagamento + fechar
async function fecharComanda(comanda_id: number, valorReais: number, metodo: string) {
  await POST('/pagamento', { comanda_id, valor_centavos: Math.round(valorReais * 100), metodo });
  await PATCH(`/comanda/${comanda_id}`, { fechada: true });
  gotoMesas();
}

14) Segurança (futuro imediato)

Hoje security: []. Preparar header Authorization: Bearer <token> sem quebrar chamadas.

Não expor segredos no client. Endpoints base em variáveis de ambiente (NEXT_PUBLIC_API_BASE_URL).

15) Roadmap “no-brainer”

MVP (este fluxo, pronto).

M1: override de taxas (PATCH comanda), listagem por status, relatórios simples.

M2: impressão local (QZ Tray), observações por item, atalhos de cozinha.
