import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getAlerts();
  return NextResponse.json({
    dataMode: "PSX_DELAYED",
    updatedAt: Date.now(),
    alerts,
  });
}
