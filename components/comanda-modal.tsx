"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { comandasApi, itensComandaApi, type Mesa } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, CreditCard } from "lucide-react"
import { AdicionarProdutoDialog } from "./adicionar-produto-dialog"
import { PagamentoDialog } from "./pagamento-dialog"
import { useComandaDetalhes } from "@/hooks/use-comanda"

interface ComandaModalProps {
  mesa: Mesa
  open: boolean
  onOpenChange: (open: boolean) => void
  onComandaUpdated: () => void
}

export function ComandaModal({ mesa, open, onOpenChange, onComandaUpdated }: ComandaModalProps) {
  const [mesaId, setMesaId] = useState<number | null>(null)
  const { comanda, isLoading: loading, mutate } = useComandaDetalhes(mesaId)
  const [abrindoComanda, setAbrindoComanda] = useState(false)
  const [nomeCliente, setNomeCliente] = useState("Consumidor")
  const [adicionarProdutoOpen, setAdicionarProdutoOpen] = useState(false)
  const [pagamentoOpen, setPagamentoOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setMesaId(mesa.id)
      setNomeCliente("Consumidor")
    } else {
      setMesaId(null)
    }
  }, [open, mesa.id])

  const abrirComanda = async () => {
    setAbrindoComanda(true)
    try {
      await comandasApi.abrir({
        mesa_id: mesa.id,
        cliente: nomeCliente,
        produtos: [],
      })

      await mutate()
      onComandaUpdated()

      toast({
        title: "Comanda aberta",
        description: `Comanda aberta para a Mesa ${mesa.numero}`,
      })
    } catch (error) {
      console.error("[v0] Error opening comanda:", error)
      toast({
        title: "Erro ao abrir comanda",
        description: "Não foi possível abrir a comanda.",
        variant: "destructive",
      })
    } finally {
      setAbrindoComanda(false)
    }
  }

  const removerItem = async (itemId: number) => {
    if (!comanda) return

    try {
      await itensComandaApi.remover(itemId)
      await mutate()
      toast({
        title: "Item removido",
        description: "Item removido da comanda com sucesso.",
      })
    } catch (error) {
      console.error("[v0] Error removing item:", error)
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item.",
        variant: "destructive",
      })
    }
  }

  const handleProdutoAdicionado = () => {
    mutate()
    onComandaUpdated()
  }

  const handlePagamentoConcluido = () => {
    onOpenChange(false)
    onComandaUpdated()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!comanda) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mesa {mesa.numero}</DialogTitle>
            <DialogDescription>Esta mesa está livre. Deseja abrir uma comanda?</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Nome do Cliente</Label>
              <Input
                id="cliente"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Consumidor"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={abrirComanda} disabled={abrindoComanda} className="w-full sm:w-auto">
                {abrindoComanda && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Abrir Comanda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>
                  Mesa {mesa.numero} - #{comanda.comanda.id}
                </span>
                <Badge variant="default" className="text-xs">
                  Aberta
                </Badge>
              </DialogTitle>
              {comanda.comanda.cliente && (
                <DialogDescription className="text-sm">Cliente: {comanda.comanda.cliente}</DialogDescription>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-hidden px-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold">Itens</h3>
                <Button onClick={() => setAdicionarProdutoOpen(true)} size="sm" className="h-8 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>

              <ScrollArea className="h-[35vh] pr-2">
                {comanda.itens.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    Nenhum item adicionado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {comanda.itens.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.produto.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.preco_unit_centavos_snapshot / 100)} x {item.qtd}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {formatCurrency((item.preco_unit_centavos_snapshot * item.qtd) / 100)}
                          </span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerItem(item.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="px-4 pb-4 space-y-3 border-t pt-3 mt-2">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(comanda.subtotal_centavos / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa Garçom</span>
                  <span>{formatCurrency(comanda.taxa_garcom_centavos / 100)}</span>
                </div>
                {comanda.taxa_couvert_centavos > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa Couvert</span>
                    <span>{formatCurrency(comanda.taxa_couvert_centavos / 100)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(comanda.total_centavos / 100)}</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Fechar
                </Button>
                <Button
                  onClick={() => setPagamentoOpen(true)}
                  disabled={comanda.itens.length === 0}
                  className="w-full sm:w-auto"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Fechar Comanda
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdicionarProdutoDialog
        open={adicionarProdutoOpen}
        onOpenChange={setAdicionarProdutoOpen}
        comandaId={comanda.comanda.id}
        onProdutoAdicionado={handleProdutoAdicionado}
      />

      <PagamentoDialog
        open={pagamentoOpen}
        onOpenChange={setPagamentoOpen}
        comanda={{
          id: comanda.comanda.id,
          subtotal: comanda.subtotal_centavos,
          taxaGarcom: comanda.taxa_garcom_centavos,
          taxaCouvert: comanda.taxa_couvert_centavos,
          desconto: 0,
          total: comanda.total_centavos,
        }}
        onPagamentoConcluido={handlePagamentoConcluido}
      />
    </>
  )
}
