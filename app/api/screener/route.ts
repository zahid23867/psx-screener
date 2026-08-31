import { NextResponse } from "next/server";
import { getAllSnapshots } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const stocks = await getAllSnapshots();
  const anyLive = stocks.some((s) => s.dataSource !== "SIMULATED_FALLBACK");
  return NextResponse.json({
    dataMode: anyLive ? "PSX_DELAYED" : "SIMULATED_FALLBACK",
    updatedAt: Date.now(),
    stocks,
  });
}
