import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2 } from "lucide-react";

interface HealthRecord {
  id: string;
  state?: string;
  confirmed?: number;
  recovered?: number;
  deaths?: number;
  updatedAt?: string;
}

const SAMPLE: HealthRecord[] = [
  {
    id: "1",
    state: "Maharashtra",
    confirmed: 5000000,
    recovered: 4800000,
    deaths: 70000,
    updatedAt: "2025-10-01",
  },
  {
    id: "2",
    state: "Karnataka",
    confirmed: 2000000,
    recovered: 1950000,
    deaths: 25000,
    updatedAt: "2025-10-01",
  },
  {
    id: "3",
    state: "Tamil Nadu",
    confirmed: 2500000,
    recovered: 2450000,
    deaths: 30000,
    updatedAt: "2025-10-01",
  },
];

export default function HealthData() {
  const [records, setRecords] = useState<HealthRecord[]>(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const DEFAULT_API =
    import.meta.env.VITE_HEALTH_API_URL || "/api/health/india/latest";
  const NEWS_API =
    import.meta.env.VITE_HEALTH_NEWS_API_URL || "/api/health/news/latest";
  const [apiUrl, setApiUrl] = useState(
    () => localStorage.getItem("health_api_url") || DEFAULT_API
  );
  const [newsApiUrl, setNewsApiUrl] = useState(
    () => localStorage.getItem("health_news_api_url") || NEWS_API
  );
  const [liveMode, setLiveMode] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Try parsing JSON, but if the endpoint returns HTML (Unexpected token '<'), handle gracefully
      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (err) {
        // response is not JSON (HTML or other) — attempt simple scrape for JSON-LD or show friendly error
        const jsonLdMatch = text.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i
        );
        if (jsonLdMatch) {
          try {
            data = JSON.parse(jsonLdMatch[1]);
          } catch (e) {
            throw new Error("Response was HTML and contained invalid JSON-LD");
          }
        } else {
          throw new Error(
            "Response was not JSON. Received HTML or other content. Check your API URL."
          );
        }
      }

      // Try to normalize a couple of common shapes
      if (Array.isArray(data)) {
        setRecords(
          data.map((d: any, idx: number) => ({
            id: String(d.id ?? idx),
            state: d.state || d.region || d.state_name,
            confirmed: d.confirmed ?? d.cases ?? d.total_confirmed,
            recovered: d.recovered ?? d.cured ?? d.total_recovered,
            deaths: d.deaths ?? d.total_deaths,
            updatedAt: d.updatedAt || d.last_updated || d.date,
          }))
        );
      } else if (data?.records && Array.isArray(data.records)) {
        setRecords(
          data.records.map((d: any, idx: number) => ({
            id: String(d.id ?? idx),
            state: d.state || d.region || d.state_name,
            confirmed: d.confirmed ?? d.cases ?? d.total_confirmed,
            recovered: d.recovered ?? d.cured ?? d.total_recovered,
            deaths: d.deaths ?? d.total_deaths,
            updatedAt: d.updatedAt || d.last_updated || d.date,
          }))
        );
      } else {
        // fallback: use sample
        setRecords(SAMPLE);
        toast({
          title: "Health data: fallback",
          description: "Using sample dataset",
        });
      }
    } catch (err: any) {
      setError(String(err.message || err));
      setRecords(SAMPLE);
    } finally {
      setLoading(false);
    }
  };

  // --- News panel ---
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [vaccData, setVaccData] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [subPhone, setSubPhone] = useState("");
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch(newsApiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // normalize: accept array or data.articles
      const items = Array.isArray(data)
        ? data
        : data.articles || data.items || [];
      setNews(items.slice(0, 12));
    } catch (err) {
      setNews([]);
      console.warn("Failed to fetch news", err);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // fetch vaccination & alerts
    (async () => {
      try {
        const r = await fetch("/api/health/vaccination");
        if (r.ok) setVaccData(await r.json());
      } catch (e) {}
      try {
        const r2 = await fetch("/api/health/alerts");
        if (r2.ok) setAlerts(await r2.json());
      } catch (e) {}
    })();
  }, []);

  const saveConfig = () => {
    localStorage.setItem("health_api_url", apiUrl);
    localStorage.setItem("health_news_api_url", newsApiUrl);
    toast({
      title: "Saved",
      description: "API endpoints saved to localStorage",
    });
  };

  const shareToWhatsApp = (text: string) => {
    // Ask for phone number to send via server (Twilio) if available, otherwise fall back to wa.me
    const to = window.prompt(
      "Enter international phone number (e.g. 919876543210) to send via WhatsApp, or leave empty to open WhatsApp Web:"
    );
    if (!to) {
      const encoded = encodeURIComponent(text);
      const url = `https://wa.me/?text=${encoded}`;
      window.open(url, "_blank");
      return;
    }

    // POST to server
    fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message: text }),
    })
      .then(async (res) => {
        if (res.status === 501) {
          // server not configured for Twilio
          toast({
            title: "Server not configured",
            description: "Opening WhatsApp Web as fallback",
          });
          const encoded = encodeURIComponent(text);
          const url = `https://wa.me/?text=${encoded}`;
          window.open(url, "_blank");
          return;
        }

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || "Failed to send");
        }

        const data = await res.json();
        toast({
          title: "Message queued",
          description: `sid: ${data.sid || "n/a"}`,
        });
      })
      .catch((err) => {
        toast({ title: "Send failed", description: String(err) });
        // fallback to wa.me
        const encoded = encodeURIComponent(text);
        const url = `https://wa.me/?text=${encoded}`;
        window.open(url, "_blank");
      });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Text copied to clipboard" });
    } catch (err) {
      toast({ title: "Copy failed", description: String(err) });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totals = records.reduce(
    (acc, r) => {
      acc.confirmed += r.confirmed || 0;
      acc.recovered += r.recovered || 0;
      acc.deaths += r.deaths || 0;
      return acc;
    },
    { confirmed: 0, recovered: 0, deaths: 0 }
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">India Health Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Latest publicly available health stats (fetched from configured API)
          </p>
        </div>
        <div className="w-96 space-y-2">
          <div className="flex gap-2">
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={DEFAULT_API}
            />
            <Button
              onClick={() => {
                fetchData();
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={newsApiUrl}
              onChange={(e) => setNewsApiUrl(e.target.value)}
              placeholder={NEWS_API}
            />
            <Button onClick={() => fetchNews()} disabled={newsLoading}>
              {newsLoading ? "Loading..." : "News"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Live mode</label>
            <input
              type="checkbox"
              checked={liveMode}
              onChange={(e) => setLiveMode(e.target.checked)}
            />
            <Button variant="ghost" onClick={saveConfig}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Confirmed</div>
          <div className="text-xl font-bold">
            {totals.confirmed.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Recovered</div>
          <div className="text-xl font-bold">
            {totals.recovered.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Deaths</div>
          <div className="text-xl font-bold">
            {totals.deaths.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Vaccination Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Vaccination (state-wise)</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={vaccData?.states || [{ state: "Sample", doses: 100 }]}
            >
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="doses" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts & Subscribe */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Live Alerts</h3>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Phone (9198...)"
              value={subPhone}
              onChange={(e) => setSubPhone(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!subPhone) return toast({ title: "Enter phone" });
                const res = await fetch("/api/notify/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone: subPhone, keywords: [] }),
                });
                if (res.ok) toast({ title: "Subscribed" });
                else toast({ title: "Subscribe failed" });
              }}
            >
              Subscribe
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="text-muted-foreground">No alerts</div>
          ) : (
            alerts.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">
                  {a.date} • {a.source}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-destructive">
          Error fetching data: {error}
        </div>
      )}

      <div className="overflow-x-auto bg-card p-2 rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">State</th>
              <th className="p-2">Confirmed</th>
              <th className="p-2">Recovered</th>
              <th className="p-2">Deaths</th>
              <th className="p-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.state}</td>
                <td className="p-2">{(r.confirmed || 0).toLocaleString()}</td>
                <td className="p-2">{(r.recovered || 0).toLocaleString()}</td>
                <td className="p-2">{(r.deaths || 0).toLocaleString()}</td>
                <td className="p-2">{r.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* News Panel */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Latest Health News</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                fetchNews();
              }}
            >
              Refresh News
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {news.length === 0 ? (
            <div className="text-muted-foreground">No news available</div>
          ) : (
            news.map((item: any, idx: number) => (
              <Card key={item.id || idx} className="p-3">
                <div className="font-medium">
                  {item.title || item.headline || item.name}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {item.description || item.summary}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(item.title + "\n" + (item.url || ""))
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      shareToWhatsApp(
                        (item.title || "") + "\n" + (item.url || "")
                      )
                    }
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <a
                    className="ml-auto text-xs text-primary"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
