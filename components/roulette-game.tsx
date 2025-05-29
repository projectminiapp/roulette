
"use client"

import { useState, useEffect } from "react"
import BettingBoard from "./betting-board"
import RouletteWheel from "./roulette-wheel"
import ChipSelector from "./chip-selector"
import ResultsHistory from "./results-history"
import UserCounter from "./user-counter"
import ViewToggle from "./view-toggle"
import StatsPanel from "./stats-panel"
import MobileControls from "./mobile-controls"
import { useUserCounter } from "@/context/user-counter-context"
import type { Bet, ChipValue, GameView, RouletteNumber } from "@/types/roulette"
import { Coins, Sparkles, Volume2, VolumeX, BarChart3, Menu } from "lucide-react"
import { playChipSound, playSpinSound, playWinSound } from "@/lib/audio"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js"
import { v4 as uuidv4 } from "uuid"

export default function RouletteGame() {
  const [selectedChip, setSelectedChip] = useState<ChipValue>(1)
  const [bets, setBets] = useState<Bet[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<RouletteNumber | null>(null)
  const [resultsHistory, setResultsHistory] = useState<RouletteNumber[]>([])
  const [balance, setBalance] = useState(0)
  const [view, setView] = useState<GameView>("classic")
  const [winAmount, setWinAmount] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const { userCount } = useUserCounter()
  const [onSpinCompleteCallback, setOnSpinCompleteCallback] = useState<(() => void) | null>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)

  const totalBetAmount = bets.reduce((total, bet) => total + bet.amount, 0)

  useEffect(() => {
    const initWallet = async () => {
      const res = await fetch("/api/nonce")
      const { nonce } = await res.json()
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce })
      if (finalPayload.status === "success") {
        setUserAddress(finalPayload.address)
      }
    }
    initWallet()
  }, [])

  const placeBet = (betType: string, value: string | number, amount: number) => {
    if (isSpinning || balance < amount) return
    if (soundEnabled) playChipSound()

    const existingBetIndex = bets.findIndex((bet) => bet.type === betType && bet.value === value)
    if (existingBetIndex >= 0) {
      const updatedBets = [...bets]
      updatedBets[existingBetIndex] = {
        ...updatedBets[existingBetIndex],
        amount: updatedBets[existingBetIndex].amount + amount,
        justUpdated: true,
      }
      setBets(updatedBets)
      setTimeout(() => {
        setBets((bets) =>
          bets.map((bet) =>
            bet.type === betType && bet.value === value ? { ...bet, justUpdated: false } : bet,
          ),
        )
      }, 500)
    } else {
      setBets([...bets, { type: betType, value, amount, justUpdated: true }])
      setTimeout(() => {
        setBets((bets) =>
          bets.map((bet) =>
            bet.type === betType && bet.value === value ? { ...bet, justUpdated: false } : bet,
          ),
        )
      }, 500)
    }

    setBalance((prev) => prev - amount)
    setWinAmount(null)
  }

  const clearBets = () => {
    if (isSpinning) return
    setBalance((prev) => prev + totalBetAmount)
    setBets([])
    setWinAmount(null)
    if (soundEnabled) playChipSound()
  }

  const spinWheel = async () => {
    if (isSpinning || bets.length === 0 || !userAddress) return

    const reference = uuidv4()
    await MiniKit.commandsAsync.pay({
      reference,
      to: process.env.NEXT_PUBLIC_HOUSE_ADDRESS!,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(totalBetAmount, Tokens.WLD).toString()
        }
      ],
      description: "Apuesta ruleta"
    })

    const result = Math.floor(Math.random() * 37) as RouletteNumber
    setLastResult(result)
    setIsSpinning(true)
    setWinAmount(null)
    if (soundEnabled) playSpinSound()

    await new Promise<void>((resolve) => {
      const handleSpinComplete = () => {
        const newHistory = [result, ...resultsHistory].slice(0, 10)
        setResultsHistory(newHistory)
        const winnings = processWinnings(result)
        if (winnings > 0 && soundEnabled) playWinSound()
        setIsSpinning(false)
        resolve()
      }
      setOnSpinCompleteCallback(() => handleSpinComplete)
    })
  }

  const processWinnings = (result: number): number => {
    let winnings = 0
    bets.forEach((bet) => {
      if (bet.type === "number" && bet.value === result) winnings += bet.amount * 36
      else if (bet.type === "color" && bet.value === getNumberColor(result)) winnings += bet.amount * 2
      else if (bet.type === "parity" && result !== 0 && bet.value === (result % 2 === 0 ? "even" : "odd"))
        winnings += bet.amount * 2
      else if (bet.type === "dozen" && result !== 0) {
        const dozen = result <= 12 ? 1 : result <= 24 ? 2 : 3
        if (bet.value === dozen) winnings += bet.amount * 3
      } else if (bet.type === "column" && result !== 0) {
        const col = result % 3 === 0 ? 3 : result % 3
        if (bet.value === col) winnings += bet.amount * 3
      } else if (bet.type === "range" && result !== 0) {
        const isLow = result <= 18
        if ((bet.value === "low" && isLow) || (bet.value === "high" && !isLow)) winnings += bet.amount * 2
      }
    })

    if (winnings > 0) {
      setBalance((prev) => prev + winnings)
      setWinAmount(winnings)
    }

    return winnings
  }

  const getNumberColor = (n: number): "red" | "black" | "green" => {
    if (n === 0) return "green"
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    return redNumbers.includes(n) ? "red" : "black"
  }

  useEffect(() => {
    if (!isSpinning && lastResult !== null) {
      const timeout = setTimeout(() => setBets([]), 2000)
      return () => clearTimeout(timeout)
    }
  }, [isSpinning, lastResult])

  return (
    <div className="w-full"> {/* Aquí deberías tener tu UI como estaba antes */} </div>
  )
}
