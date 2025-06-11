import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { Client } from '@holdstation/worldchain-ethers-v5';
import { TokenProvider } from '@holdstation/worldchain-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const client = new Client(provider);
const tokenProvider = new TokenProvider({ client });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  try {
    const balances = await tokenProvider.balanceOf({
      wallet: address,
      tokens: [TOKEN_ADDRESS],
    });
    const raw = balances[TOKEN_ADDRESS] ?? "0";
    const formatted = parseFloat(ethers.utils.formatUnits(raw, 18));
    return NextResponse.json({ balance: formatted });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
