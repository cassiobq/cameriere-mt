"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { comandasApi, produtosApi, type Mesa } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, ShoppingCart } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface AbrirComandaDialogProps {
  mesa: Mesa
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type ProdutoSelecionado = {
  produto_id: number
  nome: string
  preco_centavos: number
  qtd: number
}

export function AbrirComandaDialog({ mesa, open, onOpenChange, onSuccess }: AbrirComandaDialogProps) {
  const [nomeCliente, setNomeCliente] = useState("Consumidor")
  const [produtos, setProdutos] = useState<any[]>([])
  const [carrinho, setCarrinho] = useState<ProdutoSelecionado[]>([])
  const [loading, setLoading] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      carregarProdutos()
      setNomeCliente("Consumidor")
      setCarrinho([])
    }
  }, [open])

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      const data = await produtosApi.listar()
      setProdutos(data.filter((p: any) => p.ativo))
    } catch (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível buscar os produtos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const adicionarAoCarrinho = (produto: any) => {
    const jaExiste = carrinho.find((p) => p.produto_id === produto.id)
    
    if (jaExiste) {
      // Incrementar quantidade
      setCarrinho(carrinho.map((p) => 
        p.produto_id === produto.id 
          ? { ...p, qtd: p.qtd + 1 }
          : p
      ))
    } else {
      // Adicionar novo
      setCarrinho([
        ...carrinho,
        {
          produto_id: produto.id,
          nome: produto.nome,
          preco_centavos: produto.preco_centavos,
          qtd: 1,
        },
      ])
    }
  }

  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho(carrinho.filter((p) => p.produto_id !== produtoId))
  }

  const alterarQuantidade = (produtoId: number, novaQtd: number) => {
    if (novaQtd <= 0) {
      removerDoCarrinho(produtoId)
    } else {
      setCarrinho(carrinho.map((p) => 
        p.produto_id === produtoId 
          ? { ...p, qtd: novaQtd }
          : p
      ))
    }
  }

  const calcularTotal = () => {
    return carrinho.reduce((acc, item) => {
      return acc + (item.preco_centavos * item.qtd)
    }, 0)
  }

  const handleAbrir = async () => {
    if (carrinho.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione ao menos um produto para abrir a comanda.",
        variant: "destructive",
      })
      return
    }

    setAbrindo(true)
    try {
      // ✅ Enviar produtos conforme design da API
      await comandasApi.abrir({
        mesa_id: mesa.id,
        cliente: nomeCliente.trim() || "Consumidor",
        produtos: carrinho.map((item) => ({ produto_id: item.produto_id })),
      })

      toast({
        title: "Comanda aberta",
        description: `Comanda criada para Mesa ${mesa.numero} com ${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'}`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("[AbrirComanda] Erro:", error)
      toast({
        title: "Erro ao abrir comanda",
        description: error?.response?.data?.message || "Não foi possível abrir a comanda.",
        variant: "destructive",
      })
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="text-base sm:text-lg">
              Nova Comanda - Mesa {mesa.numero}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Adicione os produtos do pedido inicial
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
            {/* COLUNA 1: Produtos */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-muted/30">
                <h3 className="font-semibold text-sm">Produtos Disponíveis</h3>
              </div>
              <ScrollArea className="flex-1 px-4">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 py-3">
                    {produtos.map((produto) => {
                      const noCarrinho = carrinho.find((p) => p.produto_id === produto.id)
                      
                      return (
                        <button
                          key={produto.id}
                          type="button"
                          onClick={() => adicionarAoCarrinho(produto)}
                          className={cn(
                            "w-full p-3 border rounded-lg text-left transition-all active:scale-98 relative",
                            noCarrinho 
                              ? "border-primary bg-primary/5" 
                              : "border-muted hover:border-primary/50"
                          )}
                        >
                          {noCarrinho && (
                            <Badge 
                              variant="default" 
                              className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                            >
                              {noCarrinho.qtd}
                            </Badge>
                          )}
                          
                          <div className="pr-8">
                            <p className="font-medium text-sm">{produto.nome}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(produto.preco_centavos / 100)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* COLUNA 2: Carrinho */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Pedido</h3>
                <Badge variant="secondary" className="gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  {carrinho.length}
                </Badge>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Cliente */}
                <div className="px-4 py-3 border-b">
                  <Label htmlFor="cliente" className="text-xs">Cliente</Label>
                  <Input
                    id="cliente"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Consumidor"
                    className="mt-1"
                  />
                </div>

                {/* Itens */}
                <ScrollArea className="flex-1 px-4">
                  {carrinho.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                      <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum item adicionado</p>
                      <p className="text-xs mt-1">Clique nos produtos ao lado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-3">
                      {carrinho.map((item) => (
                        <div key={item.produto_id} className="flex items-center gap-2 p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.preco_centavos / 100)} × {item.qtd}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => alterarQuantidade(item.produto_id, item.qtd - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.qtd}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => alterarQuantidade(item.produto_id, item.qtd + 1)}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-1"
                              onClick={() => removerDoCarrinho(item.produto_id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="text-right ml-2">
                            <p className="font-semibold text-sm whitespace-nowrap">
                              {formatCurrency((item.preco_centavos * item.qtd) / 100)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Total */}
                {carrinho.length > 0 && (
                  <div className="px-4 py-3 border-t bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(calcularTotal() / 100)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Taxas serão calculadas ao fechar a comanda
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 py-3 border-t bg-muted/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAbrir} 
              disabled={abrindo || carrinho.length === 0} 
              className="w-full sm:w-auto"
            >
              {abrindo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Abrir Comanda ({carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
