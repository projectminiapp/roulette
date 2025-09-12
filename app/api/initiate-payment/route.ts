// /app/api/initiate-payment/route.ts
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST() {
  const reference = uuidv4()
  return NextResponse.json({ reference })
}
