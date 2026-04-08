import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDemoTreffer } from "@/lib/demo-treffer";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const demoOn =
    process.env.DASHBOARD_DEMO_TREFFER === "1" ||
    process.env.DASHBOARD_DEMO_TREFFER === "true";
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("nohand_web_treffer")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const fromDb = data || [];
    const treffer = demoOn ? [...getDemoTreffer(), ...fromDb] : fromDb;
    return NextResponse.json({ treffer });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
