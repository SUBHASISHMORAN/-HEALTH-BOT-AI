import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function News() {
  const [news, setNews] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchNews = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/health/news");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setNews(await r.json());
    } catch (e: any) {
      toast({ title: "Failed to fetch news", description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return news;
    return news.filter((n) =>
      (n.title + n.description + (n.source || ""))
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  }, [news, q]);

  const shareToWhatsapp = (n: any) => {
    const text = `${n.title} - ${n.url || ""}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">News & Advisories</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search news"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
          <Button onClick={fetchNews} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <Card className="p-4">No news found.</Card>
        ) : (
          filtered.map((n) => (
            <Card key={n.id || n.url} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{n.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    {n.source} • {n.publishedAt || n.date || "—"}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {n.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {n.url && (
                    <Button
                      variant="ghost"
                      onClick={() => window.open(n.url, "_blank")}
                    >
                      Open
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => shareToWhatsapp(n)}>
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
