import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySiweMessage } from "@worldcoin/minikit-js";

export async function POST(req: Request) {
  try {
    const { payload, nonce } = await req.json();

    // Esperar la promesa para obtener el objeto de cookies
    const cookieStore = await cookies();
    const cookieNonce = cookieStore.get("siwe")?.value;

    if (nonce !== cookieNonce) {
      return NextResponse.json(
        { status: "error", isValid: false, message: "Invalid nonce" },
        { status: 400 }
      );
    }

    const valid = await verifySiweMessage(payload, nonce);

    if (!valid.isValid) {
      return NextResponse.json(
        { status: "error", isValid: false, message: "Invalid SIWE signature" },
        { status: 401 }
      );
    }

    return NextResponse.json({ status: "success", isValid: true, address: payload.address });
  } catch (error) {
    console.error("Error en complete-siwe:", error);
    return NextResponse.json(
      { status: "error", isValid: false, message: "Server error" },
      { status: 500 }
    );
  }
}
