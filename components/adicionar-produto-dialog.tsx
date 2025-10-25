"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { comandasApi } from "@/lib/api"
import { useProdutos } from "@/hooks/use-produtos"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface AdicionarProdutoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: number
  onProdutoAdicionado: () => void
}

export function AdicionarProdutoDialog({
  open,
  onOpenChange,
  comandaId,
  onProdutoAdicionado,
}: AdicionarProdutoDialogProps) {
  const [produtoId, setProdutoId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const { produtos, isLoading } = useProdutos()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!produtoId) {
      toast({
        title: "Produto obrigatório",
        description: "Selecione um produto.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await comandasApi.adicionarItem(comandaId, produtoId)

      toast({
        title: "Produto adicionado",
        description: "Produto adicionado à comanda com sucesso.",
      })

      setProdutoId(null)
      onOpenChange(false)
      onProdutoAdicionado()
    } catch (error) {
      toast({
        title: "Erro ao adicionar produto",
        description: "Não foi possível adicionar o produto à comanda.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base sm:text-lg">Adicionar Produto</DialogTitle>
            <DialogDescription className="text-sm">Selecione um produto para adicionar.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden px-4">
              <Label className="text-sm mb-2 block">Produtos Disponíveis</Label>
              <ScrollArea className="h-[50vh]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {produtos?.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => setProdutoId(produto.id)}
                        className={cn(
                          "w-full p-3 border rounded-lg text-left transition-all active:scale-98",
                          produtoId === produto.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary"
                            : "border-muted hover:border-primary/50",
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{produto.nome}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(produto.preco_centavos / 100)}
                            </p>
                          </div>
                          {produtoId === produto.id && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 pb-4 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !produtoId} className="w-full sm:w-auto">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
