import React, { useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function badgeClass(recommendation) {
  return recommendation === "KUP" ? "badge badge-buy" : "badge badge-wait";
}

function formatDate(isoValue) {
  if (!isoValue) return "-";
  const dt = new Date(isoValue);
  return Number.isNaN(dt.getTime()) ? isoValue : dt.toLocaleString("pl-PL");
}

function filterCities(cities, query) {
  const normalized = query.trim().toLowerCase();
  const base = normalized
    ? cities.filter((city) => city.toLowerCase().includes(normalized))
    : cities;
  return base.slice(0, 40);
}

export function App() {
  const [token, setToken] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [activeTab, setActiveTab] = useState("search");

  const [form, setForm] = useState({ origin: "", destination: "", date: "2026-07-01" });
  const [cityOptions, setCityOptions] = useState([]);
  const [openCityDropdown, setOpenCityDropdown] = useState(null);
  const originComboRef = useRef(null);
  const destinationComboRef = useRef(null);
  const [alertPrice, setAlertPrice] = useState("300");
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (openCityDropdown === null) return;
    function handlePointerDown(event) {
      const t = event.target;
      if (originComboRef.current?.contains(t) || destinationComboRef.current?.contains(t)) {
        return;
      }
      setOpenCityDropdown(null);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [openCityDropdown]);

  const canCreateAlert = useMemo(
    () => Boolean(token && result && Number(alertPrice) > 0),
    [token, result, alertPrice]
  );

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd rejestracji");
      setInfo("Konto utworzone. Możesz się zalogować.");
      setIsRegisterMode(false);
      setShowAuthModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd logowania");
      setToken(data.token);
      setUserEmail(authForm.email);
      const [, payload] = data.token.split(".");
      const parsed = JSON.parse(atob(payload));
      setUserRole(parsed.role);
      setInfo("Zalogowano.");
      setShowAuthModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    setToken("");
    setUserEmail("");
    setUserRole("");
    setActiveTab("search");
    setAlerts([]);
    setHistory([]);
    setResult(null);
    setModelStats(null);
    setInfo("Wylogowano.");
  }

  async function handlePredict(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd predykcji");
      setResult(data);
      if (token) await loadHistory();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createAlert() {
    if (!canCreateAlert) return;
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          targetPrice: Number(alertPrice)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się utworzyć alertu");
      setInfo("Alert został utworzony.");
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAlerts() {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się pobrać alertów");
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteAlert(id) {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Nie udało się usunąć alertu");
      }
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadHistory() {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/search-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się pobrać historii");
      setHistory(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadModelStats() {
    if (!token || !isAdmin) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/model-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brak dostępu do statystyk modelu");
      setModelStats(data);
      setInfo("Statystyki modelu załadowane.");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) {
      loadAlerts();
      loadHistory();
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin && activeTab === "admin") {
      loadModelStats();
    }
  }, [token, isAdmin, activeTab]);

  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch(`${API_URL}/api/cities`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.cities)) {
          setCityOptions(data.cities);
        }
      } catch {
        // Intencjonalnie cicho: formularz działa także bez podpowiedzi.
      }
    }
    loadCities();
  }, []);

  return (
    <main className="dashboard-page">
      <header className="top-bar">
        <div className="top-brand">Predykcja cen</div>
        <nav className="top-nav">
          <button type="button" className={activeTab === "search" ? "tab active" : "tab"} onClick={() => setActiveTab("search")}>
            Wyszukiwarka
          </button>
          <button type="button" className={activeTab === "alerts" ? "tab active" : "tab"} onClick={() => setActiveTab("alerts")}>
            Moje Alerty
          </button>
          {token && isAdmin && (
            <button type="button" className={activeTab === "admin" ? "tab active" : "tab"} onClick={() => setActiveTab("admin")}>
              Panel admina
            </button>
          )}
          {token ? (
            <button type="button" className="logout-btn" onClick={logout}>
              👤 {userEmail} (wyloguj)
            </button>
          ) : (
            <button type="button" className="logout-btn" onClick={() => setShowAuthModal(true)}>
              👤 Zaloguj się
            </button>
          )}
        </nav>
      </header>

      <section className="content-wrap">
        {error && <p className="message error">{error}</p>}
        {info && <p className="message success">{info}</p>}

        {activeTab === "search" && (
          <>
            <section className="search-card">
              <h2>Znajdź najlepszy moment na zakup biletu</h2>
              <form onSubmit={handlePredict} autoComplete="off">
                <div className="field-row">
                  <label className="icon-input" ref={originComboRef}>
                    <span>🛫</span>
                    <input
                      autoComplete="off"
                      value={form.origin}
                      onFocus={() => setOpenCityDropdown("origin")}
                      onChange={(e) => {
                        setForm({ ...form, origin: e.target.value });
                        setOpenCityDropdown("origin");
                      }}
                      placeholder="Skąd"
                    />
                    {openCityDropdown === "origin" && (
                      <div className="city-dropdown">
                        {filterCities(cityOptions, form.origin).map((city) => (
                          <button
                            key={`origin-${city}`}
                            type="button"
                            className="city-option"
                            onClick={() => {
                              setForm({ ...form, origin: city });
                              setOpenCityDropdown(null);
                            }}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="icon-input" ref={destinationComboRef}>
                    <span>🛬</span>
                    <input
                      autoComplete="off"
                      value={form.destination}
                      onFocus={() => setOpenCityDropdown("destination")}
                      onChange={(e) => {
                        setForm({ ...form, destination: e.target.value });
                        setOpenCityDropdown("destination");
                      }}
                      placeholder="Dokąd"
                    />
                    {openCityDropdown === "destination" && (
                      <div className="city-dropdown">
                        {filterCities(cityOptions, form.destination).map((city) => (
                          <button
                            key={`destination-${city}`}
                            type="button"
                            className="city-option"
                            onClick={() => {
                              setForm({ ...form, destination: city });
                              setOpenCityDropdown(null);
                            }}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="icon-input">
                    <span>📅</span>
                    <input
                      type="date"
                      lang="pl-PL"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </label>
                </div>
                <button className="primary-button search-btn" type="submit">
                  SPRAWDŹ PROGNOZĘ
                </button>
              </form>
            </section>

            {result && (
              <section className="result-card fade-in">
                <div className={result.recommendation === "KUP" ? "decision-zone buy-zone" : "decision-zone wait-zone"}>
                  <h3>{result.recommendation === "KUP" ? "✅ KUP BILET" : "⚠ CZEKAJ"}</h3>
                  <p>Pewność modelu: {result.confidence}%</p>
                </div>
                <div className="reasoning-zone">
                  <p>
                    <strong>Aktualna najniższa cena: {result.current_price ?? "-"} PLN</strong>
                  </p>
                  <p>{result.explanation}</p>
                  <ul>
                    {result.factors?.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
                <div className="alert-zone">
                  <p>Chcesz poczekać na lepszą cenę? Ustaw alert dla tej trasy:</p>
                  <div className="alert-form">
                    <label className="price-input">
                      <input
                        type="number"
                        min="1"
                        value={alertPrice}
                        onChange={(e) => setAlertPrice(e.target.value)}
                        placeholder="Kwota"
                      />
                      <span>PLN</span>
                    </label>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={createAlert}
                      disabled={!canCreateAlert}
                    >
                      UTWÓRZ ALERT
                    </button>
                  </div>
                  {!token && <p className="inline-hint">Zaloguj się, aby zapisać alert.</p>}
                </div>
              </section>
            )}

            <section className="history-wrap">
              <h3>Ostatnie wyszukiwania</h3>
              {!token && <p className="inline-hint">Historia wyszukiwań jest dostępna po zalogowaniu.</p>}
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Trasa</th>
                    <th>Data zapytania</th>
                    <th>Decyzja modelu</th>
                    <th>Pewność</th>
                  </tr>
                </thead>
                <tbody>
                  {token && history.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-state">Brak historii wyszukiwań.</td>
                    </tr>
                  )}
                  {token && history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.origin}-{h.destination}</td>
                      <td>{formatDate(h.queriedAt)}</td>
                      <td><span className={badgeClass(h.recommendation)}>{h.recommendation}</span></td>
                      <td>{h.confidence}%</td>
                    </tr>
                  ))}
                  {!token && (
                    <tr>
                      <td colSpan="4" className="empty-state">Zaloguj się, aby zobaczyć swoją historię.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {activeTab === "alerts" && token && (
          <section className="search-card">
            <h2>Moje alerty cenowe</h2>
            <button type="button" className="outline-button" onClick={loadAlerts}>Odśwież listę</button>
            <ul className="alerts-list">
              {alerts.length === 0 && <li className="empty-state">Brak aktywnych alertów.</li>}
              {alerts.map((a) => (
                <li key={a.id} className="alert-item">
                  <span>{a.origin}-{a.destination}, próg: {a.targetPrice} PLN</span>
                  <button type="button" className="outline-button danger" onClick={() => deleteAlert(a.id)}>
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === "alerts" && !token && (
          <section className="search-card">
            <h2>Moje alerty cenowe</h2>
            <p className="inline-hint">Ta sekcja jest dostępna po zalogowaniu.</p>
          </section>
        )}

        {activeTab === "admin" && token && isAdmin && (
          <section className="search-card admin-panel-card">
            <h2>Statystyki modelu ML</h2>
            <button type="button" className="outline-button" onClick={loadModelStats}>
              Odśwież metryki
            </button>
            {modelStats && (
              <div className="admin-metrics">
                <div className="metric-tile">
                  <span className="metric-label">MAE</span>
                  <strong className="metric-value">{modelStats.mae}</strong>
                </div>
                <div className="metric-tile">
                  <span className="metric-label">RMSE</span>
                  <strong className="metric-value">{modelStats.rmse}</strong>
                </div>
                <div className="metric-tile metric-tile-wide">
                  <span className="metric-label">Ostatni trening modelu</span>
                  <strong className="metric-value">{modelStats.last_retraining}</strong>
                </div>
              </div>
            )}
          </section>
        )}
      </section>
      {showAuthModal && !token && (
        <div className="auth-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <section className="auth-card auth-modal" onClick={(e) => e.stopPropagation()}>
            <h1 className="brand">Predykcja cen</h1>
            <p className="auth-subtitle">
              {isRegisterMode ? "Utwórz konto podróżnego" : "Zaloguj się do swojego panelu"}
            </p>
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
              <label className="input-label">
                E-mail
                <input
                  type="email"
                  placeholder="Wpisz swój e-mail"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </label>
              <label className="input-label">
                Hasło
                <input
                  type="password"
                  placeholder="Wpisz swoje hasło"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                {isRegisterMode ? "ZAREJESTRUJ SIĘ" : "ZALOGUJ SIĘ"}
              </button>
            </form>
            <p className="switch-auth">
              {isRegisterMode ? "Masz już konto?" : "Nie masz konta?"}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegisterMode((v) => !v);
                  setError("");
                  setInfo("");
                }}
              >
                {isRegisterMode ? "Zaloguj się" : "Zarejestruj się"}
              </button>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
