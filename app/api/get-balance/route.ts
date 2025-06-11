import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { Client } from '@holdstation/worldchain-ethers-v5'
import { TokenProvider } from '@holdstation/worldchain-sdk'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!

// Función para obtener y validar el provider
const getProvider = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    return provider
  } catch (error) {
    console.error("Error al inicializar el provider:", error)
    return null
  }
}

export async function GET(req: NextRequest) {
  const provider = getProvider()
  
  if (!provider) {
    return NextResponse.json({ error: 'Error al inicializar el provider' }, { status: 500 })
  }

  // Validar chainId
  let chainId
  try {
    const network = await provider.getNetwork()
    chainId = network.chainId
  } catch (error) {
    console.error("Error al obtener chainId:", error)
    return NextResponse.json({ error: 'Error al obtener chainId' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')

  if (!address || !ethers.utils.isAddress(address)) {
    return NextResponse.json({ error: 'Dirección inválida o faltante' }, { status: 400 })
  }

  try {
    const client = new Client(provider)
    const tokenProvider = new TokenProvider({ client })

    const balances = await tokenProvider.balanceOf({
      wallet: address,
      tokens: [TOKEN_ADDRESS],
    })

    const rawBalance = balances[TOKEN_ADDRESS] ?? "0"
    const formatted = parseFloat(ethers.utils.formatUnits(rawBalance, 18))

    return NextResponse.json({ 
      balance: formatted,
      chainId: chainId.toString()
    })
  } catch (err: any) {
    console.error("Error al obtener el balance:", err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
