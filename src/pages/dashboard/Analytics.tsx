import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const [data, setData] = useState<any | null>(null);
  const [range, setRange] = useState("30");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const r = await fetch(`/api/health/vaccination?range=${range}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      toast({ title: "Failed to load analytics", description: String(e) });
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  const series = useMemo(() => data?.timeseries || [], [data]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => setRange(v)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData}>Reload</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">National daily trend</h3>
          {series.length > 0 ? (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="daily" stroke="#06b6d4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No series data available.
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-2">Accumulated coverage</h3>
          {series.length > 0 ? (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="cumulative" stroke="#10b981" fill="#d1fae5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No series data available.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Insights</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Top states by doses are shown in Overview.</li>
            <li>Use the range selector to zoom into recent trends.</li>
            <li>
              Download or export charts from the Overview page for offline
              analysis.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
