import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import erc20ABI from "@/lib/erc20.json";

export async function POST(req: NextRequest) {
  const { to, amount } = await req.json();

  // Usamos ethers.JsonRpcProvider para el proveedor RPC
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  // Creamos el wallet con la clave privada y el proveedor
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Creamos el contrato ERC-20
  const token = new ethers.Contract(process.env.TOKEN_ADDRESS!, erc20ABI, wallet);

  // Obtenemos los decimales del token
  const decimals = await token.decimals();

  // Usamos ethers.parseUnits directamente sin .utils
  const value = ethers.parseUnits(amount.toString(), decimals);

  // Enviamos la transacción de transferencia
  const tx = await token.transfer(to, value);

  // Esperamos la confirmación de la transacción
  await tx.wait();

  // Retornamos la respuesta con el éxito y el hash de la transacción
  return NextResponse.json({ success: true, txHash: tx.hash });
}
