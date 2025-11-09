import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import Database from "better-sqlite3";
import path from "path";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+1415xxxxxxx'
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HEALTH_VACCINATION_SOURCE = process.env.HEALTH_VACCINATION_SOURCE; // optional source URL
const HEALTH_ALERTS_SOURCE = process.env.HEALTH_ALERTS_SOURCE;

// Simple in-memory cache with TTL
const cache = new Map();
function setCache(key, value, ttl = 300) {
  const expires = Date.now() + ttl * 1000;
  cache.set(key, { value, expires });
}
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

// Persisted subscribers (SQLite)
const dbPath =
  process.env.NOTIFY_DB_PATH || path.join(process.cwd(), "notify.sqlite");
const db = new Database(dbPath);
db.exec(
  `CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    keywords TEXT,
    createdAt INTEGER
  )`
);

function addSubscriber(phone, keywords) {
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO subscribers (phone, keywords, createdAt) VALUES (?, ?, ?)"
  );
  stmt.run(phone, JSON.stringify(keywords || []), Date.now());
}

function listSubscribers() {
  return db
    .prepare(
      "SELECT id, phone, keywords, createdAt FROM subscribers ORDER BY createdAt DESC"
    )
    .all();
}

function removeSubscriberById(id) {
  return db.prepare("DELETE FROM subscribers WHERE id = ?").run(id);
}

async function sendWhatsAppViaTwilio(to, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log("Twilio not configured; skipping send");
    return { skipped: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.append("From", TWILIO_WHATSAPP_FROM);
  params.append("To", `whatsapp:${to}`);
  params.append("Body", message);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }
  const data = await resp.json();
  return data;
}

app.post("/api/whatsapp/send", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message)
    return res.status(400).json({ error: "to and message are required" });

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return res.status(501).json({ error: "Twilio not configured on server" });
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams();
    params.append("From", TWILIO_WHATSAPP_FROM);
    params.append("To", `whatsapp:${to}`);
    params.append("Body", message);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: "Twilio API error", detail: text });
    }

    const data = await resp.json();
    res.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Placeholder for a health proxy endpoint (optional)
app.get("/api/health/india/latest", async (req, res) => {
  res.json({
    message:
      "Proxy not implemented. Configure VITE_HEALTH_API_URL or implement proxy.",
  });
});

app.get("/api/health/news/latest", async (req, res) => {
  res.json([]);
});

// GET vaccination stats (cached)
app.get("/api/health/vaccination", async (req, res) => {
  const cacheKey = "vaccination_latest";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    if (HEALTH_VACCINATION_SOURCE) {
      const r = await fetch(HEALTH_VACCINATION_SOURCE);
      const data = await r.json();
      // Try basic normalizers for known sources
      let normalized = null;
      const src = HEALTH_VACCINATION_SOURCE.toLowerCase();
      if (src.includes("cowin") || src.includes("vaccine")) {
        // Example CoWIN-like payload normalizer (this is a best-effort)
        normalized = {
          totals: data.top_level_totals || data.totals || {},
          states:
            data.statewise ||
            data.states ||
            (data.regional &&
              data.regional.map((r) => ({
                state: r.name || r.state,
                doses: r.doses || r.count,
              }))) ||
            [],
          timeseries: data.timeseries || data.daily || [],
        };
      } else if (src.includes("mohfw") || src.includes("gov.in")) {
        // MoHFW style
        normalized = {
          totals: data.totals || data.summary || {},
          states: data.states || data.region || [],
          timeseries: data.timeseries || [],
        };
      } else {
        normalized = {
          totals: data.totals || {},
          states: data.states || data || [],
          timeseries: data.timeseries || [],
        };
      }

      setCache(cacheKey, normalized, 600);
      return res.json(normalized);
    }

    // fallback sample data
    const sample = {
      totals: { doses_administered: 1000000000 },
      states: [
        { state: "Maharashtra", doses: 120000000 },
        { state: "Karnataka", doses: 50000000 },
      ],
    };
    setCache(cacheKey, sample, 600);
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET alerts/ advisories
app.get("/api/health/alerts", async (req, res) => {
  const cacheKey = "alerts_latest";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    if (HEALTH_ALERTS_SOURCE) {
      const r = await fetch(HEALTH_ALERTS_SOURCE);
      const data = await r.json();
      const items = data.records || data.items || data.alerts || [];
      setCache(cacheKey, items, 300);
      return res.json(items);
    }

    // fallback
    const sampleAlerts = [
      {
        id: "a1",
        title: "Dengue advisory issued",
        date: "2025-10-17",
        severity: "moderate",
        source: "MoHFW",
      },
    ];
    setCache(cacheKey, sampleAlerts, 300);
    res.json(sampleAlerts);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET aggregated news (tries NewsAPI if key present)
app.get("/api/health/news", async (req, res) => {
  const cacheKey = "news_latest";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    if (NEWSAPI_KEY) {
      const url = `https://newsapi.org/v2/top-headlines?category=health&country=in&apiKey=${NEWSAPI_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      const articles = data.articles || [];
      setCache(cacheKey, articles, 300);
      return res.json(articles);
    }

    // fallback: empty
    setCache(cacheKey, [], 300);
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Subscribe to alerts (in-memory)
app.post("/api/notify/subscribe", (req, res) => {
  const { phone, keywords } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  try {
    addSubscriber(phone, keywords || []);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Admin: list subscribers
app.get("/api/notify/subscribers", (req, res) => {
  try {
    res.json(listSubscribers());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Admin: remove subscriber
app.delete("/api/notify/subscribers/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    removeSubscriberById(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Background poller: check alerts every minute and notify subscribers of new alerts
let lastAlertIds = new Set();
setInterval(async () => {
  try {
    const r = await fetch(
      `http://localhost:${process.env.PORT || 3001}/api/health/alerts`
    );
    if (!r.ok) return;
    const alerts = await r.json();
    for (const alert of alerts) {
      if (!lastAlertIds.has(alert.id)) {
        // new alert — notify subscribers who match keywords (or all)
        lastAlertIds.add(alert.id);
        const message = `${alert.title} - ${alert.date || ""}\nSource: ${
          alert.source || ""
        }`;
        const subs = listSubscribers();
        for (const sub of subs) {
          const keywords = JSON.parse(sub.keywords || "[]");
          if (
            keywords.length === 0 ||
            keywords.some((k) =>
              message.toLowerCase().includes(k.toLowerCase())
            )
          ) {
            try {
              await sendWhatsAppViaTwilio(sub.phone, message);
              console.log("Notified", sub.phone);
            } catch (err) {
              console.warn("Failed to notify", sub.phone, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Poller error", err);
  }
}, 60 * 1000);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server listening on ${port}`));
