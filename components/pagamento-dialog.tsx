"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { comandasApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CreditCard, Banknote, Smartphone, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface PagamentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comanda: {
    id: number
    subtotal: number
    taxaGarcom: number
    taxaCouvert?: number
    desconto?: number
    total: number
  }
  onPagamentoConcluido: () => void
}

const formasPagamento = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: Wallet },
  { value: "pix", label: "PIX", icon: Smartphone },
]

export function PagamentoDialog({ open, onOpenChange, comanda, onPagamentoConcluido }: PagamentoDialogProps) {
  const [formaPagamento, setFormaPagamento] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formaPagamento) {
      toast({
        title: "Forma de pagamento obrigatória",
        description: "Selecione uma forma de pagamento.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await comandasApi.fecharComPagamento({
        comanda_id: comanda.id,
        metodo_pagamento: formaPagamento,
      })

      toast({
        title: "Pagamento realizado",
        description: "Comanda fechada com sucesso!",
      })

      onOpenChange(false)
      onPagamentoConcluido()
    } catch (error) {
      console.error("[v0] Error processing payment:", error)
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Fechar Comanda</DialogTitle>
          <DialogDescription className="text-sm">Selecione a forma de pagamento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(comanda.subtotal / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa Garçom</span>
              <span>{formatCurrency(comanda.taxaGarcom / 100)}</span>
            </div>
            {(comanda.taxaCouvert || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa Couvert</span>
                <span>{formatCurrency((comanda.taxaCouvert || 0) / 100)}</span>
              </div>
            )}
            {(comanda.desconto || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency((comanda.desconto || 0) / 100)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-bold">
              <span>Total a Pagar</span>
              <span className="text-primary">{formatCurrency(comanda.total / 100)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {formasPagamento.map((forma) => {
                  const Icon = forma.icon
                  return (
                    <button
                      key={forma.value}
                      type="button"
                      onClick={() => setFormaPagamento(forma.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 border rounded-lg transition-all active:scale-95",
                        formaPagamento === forma.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-muted hover:border-primary/50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-6 h-6",
                          formaPagamento === forma.value ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="text-sm font-medium">{forma.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formaPagamento} className="w-full sm:w-auto">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Pagamento
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
