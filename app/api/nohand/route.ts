import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 });
  }
  const a = body.action === "on" ? "nohand_on" : body.action === "off" ? "nohand_off" : null;
  if (!a) {
    return NextResponse.json({ error: "action on|off erwartet" }, { status: 400 });
  }
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from("nohand_web_commands").insert({
      action: a,
      source: "web",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
