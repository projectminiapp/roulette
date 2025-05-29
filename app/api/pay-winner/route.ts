// /app/api/pay-winner/route.ts
import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import erc20ABI from "@/lib/erc20.json"

export async function POST(req: NextRequest) {
  const { to, amount } = await req.json()

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  const token = new ethers.Contract(process.env.TOKEN_ADDRESS!, erc20ABI, wallet)

  const decimals = await token.decimals()
  const value = ethers.parseUnits(amount.toString(), decimals)

  const tx = await token.transfer(to, value)
  await tx.wait()

  return NextResponse.json({ success: true, txHash: tx.hash })
}
