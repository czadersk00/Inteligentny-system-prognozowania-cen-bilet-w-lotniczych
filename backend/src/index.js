import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const users = [];
const alerts = [];
const searchHistory = [];
const failedLogins = new Map();

/**
 * Middleware autoryzacji JWT dla endpointów chronionych.
 * Oczekuje nagłówka: Authorization: Bearer <token>.
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Brak tokenu" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Nieprawidłowy token" });
  }
}

/**
 * Rejestracja nowego użytkownika.
 * Publiczny endpoint tworzący konto z rolą traveler.
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "E-mail i hasło (min. 8 znaków) są wymagane" });
  }
  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "Użytkownik już istnieje" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const role = "traveler";
  const user = { id: crypto.randomUUID(), email, passwordHash, role, createdAt: new Date().toISOString() };
  users.push(user);
  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

/**
 * Logowanie użytkownika i wydanie tokenu JWT.
 * Po 5 błędnych próbach logowania konto blokowane jest na 15 minut.
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const lockInfo = failedLogins.get(email);
  if (lockInfo?.lockedUntil && Date.now() < lockInfo.lockedUntil) {
    return res.status(423).json({ error: "Konto zablokowane na 15 minut" });
  }

  const user = users.find((u) => u.email === email);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!valid) {
    const attempts = (lockInfo?.attempts || 0) + 1;
    const next = { attempts, lockedUntil: null };
    if (attempts >= 5) {
      next.lockedUntil = Date.now() + 15 * 60 * 1000;
      next.attempts = 0;
    }
    failedLogins.set(email, next);
    return res.status(401).json({ error: "Błędne dane logowania" });
  }

  failedLogins.delete(email);
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
  return res.json({ token });
});

/**
 * Predykcja ceny i rekomendacji KUP/CZEKAJ.
 * Deleguje obliczenia do serwisu ML i zapisuje historię wyszukiwań.
 */
app.post("/api/predict", async (req, res) => {
  const { origin, destination, date } = req.body;
  if (!origin || !destination || !date) {
    return res.status(400).json({ error: "Lotnisko wylotu, przylotu i data są wymagane" });
  }
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, date })
    });
    if (!mlRes.ok) {
      const mlError = await mlRes.json().catch(() => ({}));
      return res.status(mlRes.status).json({ error: mlError.detail || "Błąd połączenia z modelem ML" });
    }
    const prediction = await mlRes.json();
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }

    searchHistory.push({
      id: crypto.randomUUID(),
      userId,
      origin,
      destination,
      travelDate: date,
      queriedAt: new Date().toISOString(),
      recommendation: prediction.recommendation,
      confidence: prediction.confidence,
      factors: prediction.factors,
      currentPrice: prediction.current_price ?? null,
      explanation: prediction.explanation ?? ""
    });
    return res.json(prediction);
  } catch {
    return res.status(503).json({ error: "Serwis ML niedostępny" });
  }
});

/**
 * Zwraca listę miast dostępnych w datasetcie ML.
 */
app.get("/api/cities", async (_, res) => {
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/cities`);
    if (!mlRes.ok) {
      return res.status(503).json({ error: "Nie udało się pobrać listy miast" });
    }
    return res.json(await mlRes.json());
  } catch {
    return res.status(503).json({ error: "Serwis ML niedostępny" });
  }
});

/**
 * Tworzy alert cenowy dla zalogowanego użytkownika.
 */
app.post("/api/alerts", authMiddleware, (req, res) => {
  const { origin, destination, targetPrice } = req.body;
  if (!origin || !destination || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe dane alertu" });
  }
  const alert = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    origin,
    destination,
    targetPrice,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  alerts.push(alert);
  return res.status(201).json(alert);
});

/**
 * Zwraca alerty zalogowanego użytkownika.
 */
app.get("/api/alerts", authMiddleware, (req, res) => {
  const userAlerts = alerts.filter((a) => a.userId === req.user.sub);
  return res.json(userAlerts);
});

/**
 * Usuwa alert zalogowanego użytkownika po ID.
 */
app.delete("/api/alerts/:id", authMiddleware, (req, res) => {
  const idx = alerts.findIndex((a) => a.id === req.params.id && a.userId === req.user.sub);
  if (idx === -1) return res.status(404).json({ error: "Alert nie istnieje" });
  alerts.splice(idx, 1);
  return res.status(204).send();
});

/**
 * Zwraca historię wyszukiwań zalogowanego użytkownika.
 */
app.get("/api/search-history", authMiddleware, (req, res) => {
  const history = searchHistory.filter((item) => item.userId === req.user.sub).slice(-20).reverse();
  return res.json(history);
});

/**
 * Endpoint administracyjny do podglądu statystyk modelu ML.
 */
app.get("/api/admin/model-stats", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Brak uprawnień" });
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/stats`);
    if (!mlRes.ok) return res.status(503).json({ error: "Statystyki modelu niedostępne" });
    return res.json(await mlRes.json());
  } catch {
    return res.status(503).json({ error: "Serwis ML niedostępny" });
  }
});

/**
 * Strona główna API — w przeglądarce zwykle wysyłane jest Accept: text/html, więc zwracamy prostą stronę
 * (unikamy pustego widoku „Pretty-print” przy samym JSON).
 */
app.get("/", (req, res) => {
  const accept = req.get("Accept") || "";
  if (accept.includes("text/html")) {
    return res.type("html").send(`<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><title>Backend API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem;line-height:1.5">
  <h1>Predykcja cen — backend</h1>
  <p>Ten adres (<code>:3000</code>) to <strong>API</strong>, nie strona aplikacji.</p>
  <p><strong>Otwórz aplikację:</strong> <a href="http://localhost:5173">http://localhost:5173</a></p>
  <h2>Przydatne linki</h2>
  <ul>
    <li><a href="/health"><code>GET /health</code></a> — sprawdzenie działania</li>
    <li><a href="/api/cities"><code>GET /api/cities</code></a> — lista miast</li>
  </ul>
  <p><small>JSON pod <code>GET /</code>: wyślij nagłówek <code>Accept: application/json</code> (np. curl) albo użyj narzędzi API.</small></p>
</body>
</html>`);
  }
  res.json({
    service: "Predykcja cen — backend API",
    hint: "Interfejs użytkownika: http://localhost:5173",
    endpoints: {
      health: "GET /health",
      cities: "GET /api/cities",
      predict: "POST /api/predict (origin, destination, date)",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login"
    }
  });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

/**
 * Tworzy konto administratora na starcie aplikacji na podstawie zmiennych środowiskowych:
 * INITIAL_ADMIN_EMAIL oraz INITIAL_ADMIN_PASSWORD.
 */
async function ensureInitialAdmin() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 8) return;
  if (users.some((u) => u.email === adminEmail)) return;
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  users.push({
    id: crypto.randomUUID(),
    email: adminEmail,
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString()
  });
  console.log("Initial admin account created from INITIAL_ADMIN_EMAIL");
}

ensureInitialAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
});
