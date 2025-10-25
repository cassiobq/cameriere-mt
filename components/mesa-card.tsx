"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { Mesa } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UtensilsCrossed } from "lucide-react"

interface MesaCardProps {
  mesa: Mesa
  onClick: () => void
}

export function MesaCard({ mesa, onClick }: MesaCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all active:scale-95 touch-manipulation",
        "border-muted hover:border-primary/50",
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-4 space-y-2">
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-full", "bg-muted")}>
          <UtensilsCrossed className={cn("w-6 h-6", "text-muted-foreground")} />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold">Mesa {mesa.numero}</h3>
        </div>
      </CardContent>
    </Card>
  )
}
