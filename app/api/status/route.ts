import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const STALE_SEC = 90;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("nohand_web_heartbeat")
      .select("last_seen_at, nohand_on")
      .eq("singleton", "pc")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const raw = data?.last_seen_at as string | null | undefined;
    let pcOnline = false;
    if (raw) {
      const t = new Date(raw).getTime();
      if (!Number.isNaN(t)) {
        pcOnline = (Date.now() - t) / 1000 < STALE_SEC;
      }
    }
    const rawOn = data?.nohand_on;
    const nohandOn =
      typeof rawOn === "boolean"
        ? rawOn
        : rawOn === null || rawOn === undefined
          ? null
          : Boolean(rawOn);

    return NextResponse.json({
      last_seen_at: raw ?? null,
      pcOnline,
      nohandOn,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
