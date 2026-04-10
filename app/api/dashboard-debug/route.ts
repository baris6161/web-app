import { NextRequest, NextResponse } from "next/server";
import { getSessionUsername, verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nohand_sess")?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = await getSessionUsername(token);
  const admin = (process.env.DASHBOARD_USER || "").trim();
  const isAdmin = Boolean(me && admin && me === admin);
  if (!isAdmin) {
    return NextResponse.json({ isAdmin: false });
  }
  return NextResponse.json({ isAdmin: true });
}
