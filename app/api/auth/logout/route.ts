import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.cookies.set("nohand_sess", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
