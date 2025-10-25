"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Mesa } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UtensilsCrossed } from "lucide-react"

interface MesaCardProps {
  mesa: Mesa & { ocupada?: boolean; livre?: boolean }
  onClick: () => void
}

export function MesaCard({ mesa, onClick }: MesaCardProps) {
  const ocupada = mesa.ocupada ?? false
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all active:scale-95 touch-manipulation relative",
        ocupada 
          ? "border-orange-500 bg-orange-50 hover:border-orange-600" 
          : "border-muted hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-4 space-y-2">
        {/* Badge de Status */}
        {ocupada && (
          <Badge 
            variant="default" 
            className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600"
          >
            Ocupada
          </Badge>
        )}
        
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full",
          ocupada ? "bg-orange-200" : "bg-muted"
        )}>
          <UtensilsCrossed className={cn(
            "w-6 h-6",
            ocupada ? "text-orange-700" : "text-muted-foreground"
          )} />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold">Mesa {mesa.numero}</h3>
          {!ocupada && (
            <p className="text-xs text-muted-foreground">Livre</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
