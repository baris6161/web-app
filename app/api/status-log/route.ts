import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const LIMIT = 80;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("nohand_web_status_log")
      .select("id, created_at, title, body")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) {
      return NextResponse.json({ error: error.message, entries: [] }, { status: 500 });
    }
    return NextResponse.json({ entries: data || [] });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m, entries: [] }, { status: 500 });
  }
}
