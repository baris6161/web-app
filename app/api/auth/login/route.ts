import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function plainPasswordOk(expected: string, actual: string): boolean {
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(actual, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    const expectUser = (process.env.DASHBOARD_USER || "").trim();
    const hash = (process.env.DASHBOARD_PASSWORD_HASH || "").trim();
    const plain = process.env.DASHBOARD_PASSWORD || "";
    if (!expectUser || (!hash && !plain)) {
      return NextResponse.json(
        { error: "Server nicht konfiguriert." },
        { status: 500 }
      );
    }
    if (username !== expectUser) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten." }, { status: 401 });
    }
    const ok = hash
      ? await bcrypt.compare(password, hash)
      : plainPasswordOk(plain, password);
    if (!ok) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten." }, { status: 401 });
    }
    const token = await createSessionToken(username);
    const res = NextResponse.json({ ok: true });
    const secure =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    res.cookies.set("nohand_sess", token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
}
