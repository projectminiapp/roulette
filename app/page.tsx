"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { UserCounterProvider } from "@/context/user-counter-context"

// Carga dinámica del componente sin SSR para evitar problemas con APIs de navegador
const RouletteGame = dynamic(() => import("@/components/roulette-game"), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900">
      <UserCounterProvider>
        <Suspense
          fallback={
            <div className="w-full h-screen flex items-center justify-center text-white text-xl">
              Cargando...
            </div>
          }
        >
          <RouletteGame />
        </Suspense>
      </UserCounterProvider>
    </main>
  )
}
