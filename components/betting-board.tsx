"use client"

import type { Bet, GameView } from "@/types/roulette"

interface BettingBoardProps {
  onPlaceBet: (type: string, value: string | number) => void
  currentBets: Bet[]
  view: GameView
}

export default function BettingBoard({ onPlaceBet, currentBets, view }: BettingBoardProps) {
  // Obtener cantidad apostada para una apuesta específica y si fue actualizada recientemente
  const getBetAmount = (type: string, value: string | number): { amount: number; justUpdated: boolean } => {
    const bet = currentBets.find((b) => b.type === type && b.value === value)
    return bet ? { amount: bet.amount, justUpdated: bet.justUpdated || false } : { amount: 0, justUpdated: false }
  }

  // Update the renderBetChip function to improve chip stacking design
  const renderBetChip = (type: string, value: string | number) => {
    const { amount, justUpdated } = getBetAmount(type, value)
    if (amount <= 0) return null

    // Determine chip color and value based on total amount
    let chipColor = "bg-white text-black" // Texto negro para fichas blancas
    let chipValue = 0.1

    if (amount >= 50) {
      chipColor = "bg-yellow-400"
      chipValue = 50
    } else if (amount >= 10) {
      chipColor = "bg-purple-500 text-white"
      chipValue = 10
    } else if (amount >= 5) {
      chipColor = "bg-black text-white"
      chipValue = 5
    } else if (amount >= 2) {
      chipColor = "bg-green-500 text-white"
      chipValue = 2
    } else if (amount >= 1) {
      chipColor = "bg-red-500 text-white"
      chipValue = 1
    } else if (amount >= 0.5) {
      chipColor = "bg-blue-500 text-white"
      chipValue = 0.5
    }

    // Asegurarse de que las fichas sean visibles en todas las secciones
    return (
      <div className={`absolute inset-0 flex items-center justify-center z-10 ${justUpdated ? "animate-bounce" : ""}`}>
        <div
          className={`${chipColor} text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white shadow-md ${justUpdated ? "ring-2 ring-yellow-300" : ""}`}
        >
          {Number(amount.toFixed(2))}
        </div>
      </div>
    )
  }

  // Add the isRedNumber function directly in the component
  const isRedNumber = (num: number): boolean => {
    return [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num)
  }

  // Update the red/black betting areas to remove R/N letters
  const renderNumber = (num: number) => {
    return (
      <div
        key={`number-${num}`}
        className={`relative ${
          isRedNumber(num) ? "bg-[#b22222]" : "bg-[#1e1e1e]"
        } text-white font-bold text-center py-1 text-xs border-2 border-white cursor-pointer transition-all hover:opacity-90 active:opacity-75`}
        onClick={() => onPlaceBet("number", num)}
      >
        {renderBetChip("number", num)}
        {num}
      </div>
    )
  }

  return (
    <div className="w-full rounded-md overflow-hidden border border-[#1a2b47] bg-[#0d1e3a] shadow-md">
      {/* Cero */}
      <div
        className="w-full bg-green-600 text-white font-bold text-center py-1 text-sm border-b border-[#1a2b47] relative"
        onClick={() => onPlaceBet("number", 0)}
      >
        {renderBetChip("number", 0)}0
      </div>

      {/* Números 1-36 */}
      <div className="grid grid-cols-3 w-full">
        {/* Primera fila: 1-12 */}
        {renderNumber(1)}
        {renderNumber(2)}
        {renderNumber(3)}
        {renderNumber(4)}
        {renderNumber(5)}
        {renderNumber(6)}
        {renderNumber(7)}
        {renderNumber(8)}
        {renderNumber(9)}
        {renderNumber(10)}
        {renderNumber(11)}
        {renderNumber(12)}

        {/* Segunda fila: 13-24 */}
        {renderNumber(13)}
        {renderNumber(14)}
        {renderNumber(15)}
        {renderNumber(16)}
        {renderNumber(17)}
        {renderNumber(18)}
        {renderNumber(19)}
        {renderNumber(20)}
        {renderNumber(21)}
        {renderNumber(22)}
        {renderNumber(23)}
        {renderNumber(24)}

        {/* Tercera fila: 25-36 */}
        {renderNumber(25)}
        {renderNumber(26)}
        {renderNumber(27)}
        {renderNumber(28)}
        {renderNumber(29)}
        {renderNumber(30)}
        {renderNumber(31)}
        {renderNumber(32)}
        {renderNumber(33)}
        {renderNumber(34)}
        {renderNumber(35)}
        {renderNumber(36)}
      </div>

      {/* Apuestas de columna (2:1) */}
      <div className="grid grid-cols-3 w-full">
        {[1, 2, 3].map((col) => (
          <div
            key={`col-${col}`}
            className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
            onClick={() => onPlaceBet("column", col)}
          >
            {renderBetChip("column", col)}
            <span className="relative z-0">2:1</span>
          </div>
        ))}
      </div>

      {/* Apuestas externas en formato compacto */}
      <div className="grid grid-cols-3 w-full">
        {/* Primera docena */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("dozen", 1)}
        >
          {renderBetChip("dozen", 1)}
          <span className="relative z-0">1-12</span>
        </div>

        {/* Segunda docena */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("dozen", 2)}
        >
          {renderBetChip("dozen", 2)}
          <span className="relative z-0">13-24</span>
        </div>

        {/* Tercera docena */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("dozen", 3)}
        >
          {renderBetChip("dozen", 3)}
          <span className="relative z-0">25-36</span>
        </div>
      </div>

      {/* Apuestas simples */}
      <div className="grid grid-cols-6 w-full">
        {/* 1-18 */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("range", "low")}
        >
          {renderBetChip("range", "low")}
          <span className="relative z-0">1-18</span>
        </div>

        {/* Par */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("parity", "even")}
        >
          {renderBetChip("parity", "even")}
          <span className="relative z-0">Even</span>
        </div>

        {/* Rojo */}
        <div
          className="relative bg-[#b22222] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:opacity-90"
          onClick={() => onPlaceBet("color", "red")}
        >
          {renderBetChip("color", "red")}
        </div>

        {/* Negro */}
        <div
          className="relative bg-[#1e1e1e] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:opacity-90"
          onClick={() => onPlaceBet("color", "black")}
        >
          {renderBetChip("color", "black")}
        </div>

        {/* Impar */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("parity", "odd")}
        >
          {renderBetChip("parity", "odd")}
          <span className="relative z-0">Odd</span>
        </div>

        {/* 19-36 */}
        <div
          className="relative bg-[#0d1e3a] text-white font-bold text-center py-1 text-[10px] border-2 border-white cursor-pointer hover:bg-[#162a4a]"
          onClick={() => onPlaceBet("range", "high")}
        >
          {renderBetChip("range", "high")}
          <span className="relative z-0">19-36</span>
        </div>
      </div>
    </div>
  )
}
