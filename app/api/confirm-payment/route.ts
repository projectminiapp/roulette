// /app/api/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { reference } = await req.json()

  const response = await fetch("https://developer.worldcoin.org/api/v1/verify-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEV_PORTAL_API_KEY}`,
    },
    body: JSON.stringify({ reference }),
  })

  const result = await response.json()

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, tx: result.tx })
}
