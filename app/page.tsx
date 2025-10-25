"use client"

import { useState } from "react"
import { useMesas } from "@/hooks/use-mesas"
import { MesaCard } from "@/components/mesa-card"
import { ComandaModal } from "@/components/comanda-modal"
import type { Mesa } from "@/lib/types"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function MesasPage() {
  const { mesas, loading, error, refresh } = useMesas()
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleMesaClick = (mesa: Mesa) => {
    setMesaSelecionada(mesa)
    setModalOpen(true)
  }

  const handleComandaUpdated = () => {
    refresh()
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    refresh()
    // Simular delay visual mínimo
    setTimeout(() => setRefreshing(false), 500)
  }

  if (loading && !mesas.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar mesas</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Tentar novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Comandas</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} • 
                {mesas.filter(m => m.ocupada).length} ocupada{mesas.filter(m => m.ocupada).length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {mesas?.map((mesa) => (
            <MesaCard key={mesa.id} mesa={mesa} onClick={() => handleMesaClick(mesa)} />
          ))}
        </div>

        {mesas?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-muted-foreground">Nenhuma mesa cadastrada</p>
            <p className="text-sm text-muted-foreground mt-2">Cadastre mesas no sistema para começar</p>
          </div>
        )}
      </main>

      {mesaSelecionada && (
        <ComandaModal
          mesa={mesaSelecionada}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onComandaUpdated={handleComandaUpdated}
        />
      )}
    </div>
  )
}
