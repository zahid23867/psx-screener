import { DataModeBanner } from "@/components/data-mode-banner";
import { StatsOverview } from "@/components/stats-overview";
import { ScreenerTable } from "@/components/screener-table";
import { AlertsPanel } from "@/components/alerts-panel";
import { SqueezePanel } from "@/components/squeeze-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Bell, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">PSX Screener</h1>
          <p className="text-sm text-muted-foreground">
            KSE-100 stocks ranked for maximum profit potential within the next month — signals,
            breakout alerts, and squeeze setups, sourced from real (delayed) PSX data.
          </p>
        </div>

        <DataModeBanner />
        <StatsOverview />

        <Tabs defaultValue="screener" className="w-full">
          <TabsList>
            <TabsTrigger value="screener" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Screener
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="h-4 w-4" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="squeeze" className="gap-1.5">
              <Activity className="h-4 w-4" /> Squeeze Setups
            </TabsTrigger>
          </TabsList>
          <TabsContent value="screener" className="mt-4">
            <ScreenerTable />
          </TabsContent>
          <TabsContent value="alerts" className="mt-4">
            <AlertsPanel />
          </TabsContent>
          <TabsContent value="squeeze" className="mt-4">
            <SqueezePanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
