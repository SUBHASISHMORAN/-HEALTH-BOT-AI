import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type AlertItem = {
  id: string;
  title: string;
  date?: string;
  severity?: "low" | "medium" | "high";
  source?: string;
  description?: string;
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/health/alerts");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      // normalize to array
      setAlerts(Array.isArray(json) ? json : json.items || []);
    } catch (e: any) {
      toast({ title: "Failed to load alerts", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    // group by severity
    const groups: Record<string, AlertItem[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const a of alerts) {
      const s = (a.severity as string) || "low";
      groups[s] = groups[s] || [];
      groups[s].push(a);
    }
    return groups;
  }, [alerts]);

  const subscribe = async () => {
    if (!phone) return toast({ title: "Enter phone" });
    try {
      const r = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, keywords: [] }),
      });
      if (r.ok) {
        toast({
          title: "Subscribed",
          description: "You'll receive alerts via WhatsApp (if configured).",
        });
        setPhone("");
      } else {
        const txt = await r.text();
        toast({ title: "Subscribe failed", description: txt });
      }
    } catch (e: any) {
      toast({ title: "Subscribe failed", description: String(e) });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Live Alerts</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Phone e.g. 9198..."
            value={phone}
            onChange={(e: any) => setPhone(e.target.value)}
          />
          <Button onClick={subscribe}>Subscribe</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Active alerts</div>
              <div className="text-xl font-bold">{alerts.length}</div>
            </div>
            <div>
              <Button variant="ghost" onClick={fetchAlerts} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">High severity</div>
          <div className="text-lg font-semibold">
            {grouped.high?.length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Medium / Low</div>
          <div className="text-lg font-semibold">
            {(grouped.medium?.length || 0) + (grouped.low?.length || 0)}
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {["high", "medium", "low"].map((severity) => (
          <div key={severity}>
            <h3 className="font-semibold mb-2">{severity.toUpperCase()}</h3>
            {grouped[severity]?.length ? (
              grouped[severity].map((a) => (
                <Card key={a.id} className="p-3 mb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.date} • {a.source}
                      </div>
                      {a.description && (
                        <div className="mt-1 text-sm">{a.description}</div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Badge
                        variant={
                          severity === "high"
                            ? "destructive"
                            : severity === "medium"
                            ? "outline"
                            : "secondary"
                        }
                        className="uppercase"
                      >
                        {severity}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No {severity} alerts
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
