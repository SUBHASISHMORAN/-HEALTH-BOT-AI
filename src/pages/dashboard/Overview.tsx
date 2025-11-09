import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";

// Note: we intentionally avoid using `require()` here (not available in browser).
// If marker icons are missing in your build, add the image imports centrally
// or place the Leaflet images in `public/` and set their URLs here.

function formatNumber(n: number | undefined) {
  if (!n && n !== 0) return "—";
  try {
    return Number(n).toLocaleString();
  } catch {
    return String(n);
  }
}

export default function Overview() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVacc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/vaccination");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast({
        title: "Failed to load vaccination data",
        description: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacc();
  }, []);

  const totals = data?.totals || {};

  // prepare state-wise table/chart
  const states = useMemo(() => {
    const list = (data?.states || []).map((s: any) => ({
      state: s.state || s.name || s.state_name,
      doses: s.doses || s.doses_administered || s.count || 0,
      population: s.population || null,
    }));
    // sort by doses desc
    return list.sort((a: any, b: any) => b.doses - a.doses).slice(0, 20);
  }, [data]);

  // export top states to CSV
  const exportCSV = () => {
    const rows = ["state,doses,population"]
      .concat(
        (states || []).map(
          (s: any) => `${s.state},${s.doses},${s.population || ""}`
        )
      )
      .join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top_states_vaccination.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // small time-series if present
  const timeSeries = data?.timeseries || data?.time_series || data?.daily || [];

  const geoJsonRef = useRef<any>(null);
  const [geoJson, setGeoJson] = useState<any | null>(null);

  useEffect(() => {
    // try to fetch public/india-states.geojson first; fall back to a tiny sample
    const tryLoad = async () => {
      try {
        const r = await fetch("/india-states.geojson");
        if (r.ok) {
          const j = await r.json();
          setGeoJson(j);
          return;
        }
      } catch (e) {
        // ignore
      }

      // tiny fallback sample with two simple polygons (not geographically accurate) so map renders
      setGeoJson({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { ST_NM: "Maharashtra" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [72.0, 20.0],
                  [76.0, 20.0],
                  [76.0, 17.0],
                  [72.0, 17.0],
                  [72.0, 20.0],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: { ST_NM: "Karnataka" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [74.0, 16.0],
                  [78.0, 16.0],
                  [78.0, 12.0],
                  [74.0, 12.0],
                  [74.0, 16.0],
                ],
              ],
            },
          },
        ],
      });
    };
    tryLoad();
  }, []);

  // return color scale based on doses value
  const colorFor = (v: number, max = 1) => {
    const pct = Math.min(1, v / Math.max(1, max));
    if (pct > 0.75) return "#084594";
    if (pct > 0.5) return "#2171b5";
    if (pct > 0.25) return "#6baed6";
    return "#c6dbef";
  };

  const maxDoses = Math.max(...(states.map((s: any) => s.doses) || [0]));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard — Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time vaccination & health snapshot (source: configured backend)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchVacc} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="ghost" onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Doses</div>
          <div className="text-xl font-bold">
            {formatNumber(totals.doses_administered || totals.total_doses)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Updated: {data?.updated_at || data?.last_updated || "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Daily Doses</div>
          <div className="text-xl font-bold">
            {formatNumber(totals.daily_doses)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg (7d): {formatNumber(totals.daily_7avg || totals.daily_avg)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Coverage</div>
          <div className="text-xl font-bold">
            {totals.coverage_percent
              ? `${Number(totals.coverage_percent).toFixed(1)}%`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Fully vaccinated: {formatNumber(totals.fully_vaccinated)}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-medium mb-2">State-wise doses (top 20)</h3>
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart
                data={states.map((s: any) => ({
                  state: s.state,
                  doses: s.doses,
                }))}
              >
                <XAxis dataKey="state" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="doses" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-2">Trends</h3>
          {timeSeries && timeSeries.length > 0 ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={timeSeries}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => String(d).slice(5)}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="daily"
                    stroke="#06b6d4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No time-series available from the source.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-4">
          <h3 className="font-medium mb-2">India choropleth (state-level)</h3>
          <div style={{ width: "100%", height: 480 }}>
            <MapContainer
              {...({
                center: [22.0, 80.0],
                zoom: 4,
                style: { height: "100%", width: "100%" },
              } as any)}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {geoJson && (
                <GeoJSON
                  {...({
                    data: geoJson,
                    ref: geoJsonRef,
                    style: (feature: any) => {
                      const name =
                        feature?.properties?.ST_NM ||
                        feature?.properties?.NAME ||
                        feature?.properties?.state ||
                        "";
                      const found = states.find(
                        (s: any) =>
                          String(s.state).toLowerCase() ===
                          String(name).toLowerCase()
                      );
                      const val = found ? found.doses : 0;
                      return {
                        weight: 1,
                        color: "#444",
                        fillOpacity: 0.8,
                        fillColor: colorFor(val, maxDoses),
                      };
                    },
                    onEachFeature: (feature: any, layer: any) => {
                      const name =
                        feature?.properties?.ST_NM ||
                        feature?.properties?.NAME ||
                        feature?.properties?.state ||
                        "";
                      const found = states.find(
                        (s: any) =>
                          String(s.state).toLowerCase() ===
                          String(name).toLowerCase()
                      );
                      const val = found ? found.doses : 0;
                      layer.bindPopup(
                        `<strong>${name}</strong><br/>Doses: ${val.toLocaleString()}`
                      );
                    },
                  } as any)}
                />
              )}
            </MapContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Tip: place a file `public/india-states.geojson` (GeoJSON of Indian
            states) to enable full choropleth. Otherwise a small sample is used.
          </div>
        </Card>
      </div>
    </div>
  );
}
