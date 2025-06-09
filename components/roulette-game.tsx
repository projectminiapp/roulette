"use client";

import { useState, useEffect } from "react";
import BettingBoard from "./betting-board";
import RouletteWheel from "./roulette-wheel";
import ChipSelector from "./chip-selector";
import ResultsHistory from "./results-history";
import UserCounter from "./user-counter";
import ViewToggle from "./view-toggle";
import StatsPanel from "./stats-panel";
import MobileControls from "./mobile-controls";
import { useUserCounter } from "@/context/user-counter-context";
import type { Bet, ChipValue, GameView, RouletteNumber } from "@/types/roulette";
import { Coins, Sparkles, Volume2, VolumeX, BarChart3, Menu } from "lucide-react";
import { playChipSound, playSpinSound, playWinSound } from "@/lib/audio";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { v4 as uuidv4 } from "uuid";
import { formatUnits } from "ethers/lib/utils";

import { createPublicClient, http, multicall3Abi, type PublicClient } from "viem";
import { TokenProvider } from "@holdstation/worldchain-sdk";

const WLD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const HOUSE_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_ADDRESS!;

const client = createPublicClient({
  transport: http(RPC_URL),  // Solo configurando el RPC
}) as PublicClient;

const tokenProvider = new TokenProvider({
  client: client as any,
});

export default function RouletteGame() {
  const [selectedChip, setSelectedChip] = useState<ChipValue>(1);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<RouletteNumber | null>(null);
  const [resultsHistory, setResultsHistory] = useState<RouletteNumber[]>([]);
  const [balance, setBalance] = useState(0);
  const [view, setView] = useState<GameView>("classic");
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const { userCount } = useUserCounter();
  const [onSpinCompleteCallback, setOnSpinCompleteCallback] = useState<(() => void) | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const totalBetAmount = bets.reduce((total, bet) => total + bet.amount, 0);

  const fetchBalance = async (address: string | null) => {
    if (!address) return;
    try {
      const balances = await tokenProvider.balanceOf({
        wallet: address,
        tokens: [WLD_CONTRACT_ADDRESS],
      });
      const rawBalance = balances[WLD_CONTRACT_ADDRESS] ?? "0";
      const balanceInEth = parseFloat(formatUnits(rawBalance, 18));
      setBalance(balanceInEth);
    } catch (err) {
      console.error("Error obteniendo balance con Holdstation SDK:", err);
      setBalance(0);
    }
  };

  useEffect(() => {
    const initWallet = async () => {
      try {
        await MiniKit.install();
        const res = await fetch("/api/nonce");
        const { nonce } = await res.json();
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce });
        if (finalPayload.status === "success") {
          setUserAddress(finalPayload.address);
          await fetchBalance(finalPayload.address);
        }
      } catch (err) {
        console.error("Wallet initialization error:", err);
      }
    };
    initWallet();
  }, []);


  const placeBet = (betType: string, value: string | number, amount: number) => {
    if (isSpinning || balance < amount) return;
    if (soundEnabled) playChipSound();

    const existingBetIndex = bets.findIndex((bet) => bet.type === betType && bet.value === value);
    if (existingBetIndex >= 0) {
      const updatedBets = [...bets];
      updatedBets[existingBetIndex] = {
        ...updatedBets[existingBetIndex],
        amount: updatedBets[existingBetIndex].amount + amount,
        justUpdated: true,
      };
      setBets(updatedBets);
    } else {
      setBets([...bets, { type: betType, value, amount, justUpdated: true }]);
    }

    setTimeout(() => {
      setBets((b) =>
        b.map((bet) =>
          bet.type === betType && bet.value === value ? { ...bet, justUpdated: false } : bet,
        ),
      );
    }, 500);

    setWinAmount(null);
  };

  const clearBets = () => {
    if (isSpinning) return;
    setBets([]);
    setWinAmount(null);
    if (soundEnabled) playChipSound();
  };

  const spinWheel = async () => {
    if (isSpinning || bets.length === 0 || !userAddress) return;

    try {
      const nonceRes = await fetch("/api/nonce");
      const { nonce } = await nonceRes.json();

      const { finalPayload: loginPayload } = await MiniKit.commandsAsync.walletAuth({ nonce });
      await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: loginPayload, nonce }),
      });

      const payRefRes = await fetch("/api/initiate-payment", { method: "POST" });
      const { id: reference } = await payRefRes.json();

      const payPayload = {
        reference,
        to: HOUSE_ADDRESS,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(totalBetAmount, Tokens.WLD).toString(),
          },
        ],
        description: "Apuesta ruleta",
      };
      const { finalPayload: payFinalPayload } = await MiniKit.commandsAsync.pay(payPayload);
      if (payFinalPayload.status !== "success") {
        alert("Pago cancelado o fallido");
        return;
      }

      const confirmRes = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: payFinalPayload }),
      });
      const confirmResult = await confirmRes.json();
      if (!confirmResult.success) {
        alert("No se pudo confirmar el pago");
        return;
      }

      setIsSpinning(true);
      setWinAmount(null);
      const result = Math.floor(Math.random() * 37) as RouletteNumber;
      setLastResult(result);

      if (soundEnabled) playSpinSound();

      await new Promise<void>((resolve) => {
        const handleSpinComplete = async () => {
          const newHistory = [result, ...resultsHistory].slice(0, 10);
          setResultsHistory(newHistory);

          const winnings = processWinnings(result);
          if (winnings > 0 && soundEnabled) playWinSound();

          await fetchBalance(userAddress);

          setIsSpinning(false);
          resolve();
        };
        setOnSpinCompleteCallback(() => handleSpinComplete);
      });
    } catch (err) {
      console.error("Error en spinWheel:", err);
      alert("Error durante el pago o ruleta");
      setIsSpinning(false);
    }
  };

  const processWinnings = (result: number): number => {
    let winnings = 0;
    bets.forEach((bet) => {
      if (bet.type === "number" && bet.value === result) winnings += bet.amount * 36;
      else if (bet.type === "color" && bet.value === getNumberColor(result)) winnings += bet.amount * 2;
      else if (bet.type === "parity" && result !== 0 && bet.value === (result % 2 === 0 ? "even" : "odd"))
        winnings += bet.amount * 2;
      else if (bet.type === "dozen" && result !== 0) {
        const dozen = result <= 12 ? 1 : result <= 24 ? 2 : 3;
        if (bet.value === dozen) winnings += bet.amount * 3;
      } else if (bet.type === "column" && result !== 0) {
        const col = result % 3 === 0 ? 3 : result % 3;
        if (bet.value === col) winnings += bet.amount * 3;
      } else if (bet.type === "range" && result !== 0) {
        const isLow = result <= 18;
        if ((bet.value === "low" && isLow) || (bet.value === "high" && !isLow)) winnings += bet.amount * 2;
      }
    });

    if (winnings > 0) setWinAmount(winnings);
    return winnings;
  };

  const getNumberColor = (n: number): "red" | "black" | "green" => {
    if (n === 0) return "green";
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(n) ? "red" : "black";
  };

  useEffect(() => {
    if (!isSpinning && lastResult !== null) {
      const timeout = setTimeout(() => setBets([]), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isSpinning, lastResult]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-1 bg-[#0d1e3a]">
      <div className="w-full flex justify-between items-center mb-1 sticky top-0 z-30 bg-[#0d1e3a] bg-opacity-95 p-1 border-b border-[#1a2b47]">
        <div className="text-base font-bold flex items-center gap-1">
          <Sparkles className="text-yellow-400" size={14} />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-300">
            Roulette Casino
          </span>
        </div>

        <div className="flex items-center gap-2">
          <UserCounter count={userCount} />
          <Sheet>
            <SheetTrigger asChild>
              <button className="bg-[#1a2b47] text-white p-1 rounded-full hover:bg-[#2a3b57] transition-all">
                <Menu size={16} className="text-yellow-400" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0d1e3a] border-l border-[#1a2b47] p-4">
              <div className="flex flex-col gap-4 mt-6">
                <h3 className="text-lg font-bold text-yellow-400">Opciones</h3>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#1a2b47] text-white"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 size={18} className="text-green-400" /> Sonidos activados
                    </>
                  ) : (
                    <>
                      <VolumeX size={18} className="text-red-400" /> Sonidos desactivados
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#1a2b47] text-white"
                >
                  <BarChart3 size={18} className="text-purple-400" />
                  {showStats ? "Ocultar estadísticas" : "Mostrar estadísticas"}
                </button>

                <ViewToggle currentView={view} onViewChange={setView} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 relative">
        <div className="flex items-center gap-2 bg-[#1a2b47] p-1 rounded-full shadow-md z-10 w-full justify-center">
          <div className="text-xs font-semibold flex items-center gap-1 text-white">
            <Coins className="text-yellow-400" size={12} />
            <span>
              Balance: <span className="text-yellow-300">{balance.toFixed(2)} WLD</span>
            </span>
          </div>
          <div className="text-xs font-semibold text-white">
            Bet: <span className="text-green-300">{totalBetAmount.toFixed(2)} WLD</span>
          </div>
        </div>

        {winAmount !== null && (
          <div className="text-xs font-semibold animate-pulse bg-[#1a2b47] px-2 py-0.5 rounded-full z-10">
            Win: <span className="text-yellow-300">{winAmount.toFixed(2)} WLD</span>!
          </div>
        )}

        <div className="flex flex-col w-full gap-2 items-center justify-center z-10">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[250px]">
              <RouletteWheel
                isSpinning={isSpinning}
                lastResult={lastResult}
                onSpinComplete={onSpinCompleteCallback || (() => {})}
                view={view}
              />
            </div>
          </div>

          <ResultsHistory history={resultsHistory} />

          <div className="w-full">
            <BettingBoard
              onPlaceBet={(type, value) => placeBet(type, value, selectedChip)}
              currentBets={bets}
              view={view}
            />
          </div>
        </div>

        {showStats && <StatsPanel history={resultsHistory} />}

        <div className="w-full flex flex-col gap-2 z-10 sticky bottom-0 bg-[#0d1e3a] bg-opacity-95 p-1 border-t border-[#1a2b47]">
          <ChipSelector selectedChip={selectedChip} onSelectChip={setSelectedChip} view={view} />
          <MobileControls
            onClearBets={clearBets}
            onSpin={spinWheel}
            isSpinning={isSpinning}
            hasBets={bets.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
