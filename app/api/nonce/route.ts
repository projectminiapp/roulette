// /app/api/nonce/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  const nonce = crypto.randomUUID()
  return NextResponse.json({ nonce })
}
