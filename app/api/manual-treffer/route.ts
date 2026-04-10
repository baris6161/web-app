import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const u = new URL(req.url);
    const page = Math.max(1, Number(u.searchParams.get("page") || "1"));
    const pageSize = Math.min(
      200,
      Math.max(10, Number(u.searchParams.get("pageSize") || "50"))
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sb = supabaseAdmin();
    const { data, error, count } = await sb
      .from("manual_web_treffer")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: lastRows } = await sb
      .from("manual_web_treffer")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: importRows } = await sb
      .from("manual_web_treffer")
      .select("created_at")
      .eq("import_tag", "csv_bootstrap")
      .order("created_at", { ascending: false })
      .limit(1);
    return NextResponse.json({
      treffer: data || [],
      meta: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      },
      health: {
        lastInsertAt: (lastRows?.[0]?.created_at as string | undefined) ?? null,
        lastImportAt: (importRows?.[0]?.created_at as string | undefined) ?? null,
      },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
