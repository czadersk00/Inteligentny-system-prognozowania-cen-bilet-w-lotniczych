# Dokumentacja techniczna

Ten dokument stanowi techniczną dokumentację systemu i jest częścią repozytorium.

## Swagger / OpenAPI

Serwis ML (FastAPI) automatycznie udostępnia dokumentację OpenAPI:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

To spełnia wymaganie "endpoint /swagger lub odpowiednik" oraz "OpenAPI jako endpoint generowany automatycznie".

## Dokumentacja metod i klas w kodzie

W projekcie dodano dokumentację publicznych metod i klas:

- Backend (`backend/src/index.js`) — komentarze JSDoc dla:
  - middleware `authMiddleware`,
  - endpointów publicznych i chronionych (`/api/auth/*`, `/api/predict`, `/api/alerts`, `/api/search-history`, `/api/admin/model-stats`, `/api/cities`),
  - funkcji inicjalizującej administratora `ensureInitialAdmin`.

- Serwis ML (`ml-service/app.py`) — docstringi dla:
  - funkcji pomocniczych (`normalize_column_name`, `load_dataset`),
  - modelu wejściowego `PredictRequest`,
  - endpointów (`/health`, `/cities`, `/predict`, `/stats`),
  - funkcji startowej `startup`.

## Główne endpointy aplikacji

### Backend (`http://localhost:3000`)

- `POST /api/auth/register` — rejestracja użytkownika (`traveler`).
- `POST /api/auth/login` — logowanie i token JWT.
- `POST /api/predict` — predykcja ceny i rekomendacji.
- `GET /api/cities` — lista miast z datasetu (proxy do ML).
- `POST /api/alerts` — utworzenie alertu (wymaga JWT).
- `GET /api/alerts` — lista alertów użytkownika (wymaga JWT).
- `DELETE /api/alerts/:id` — usunięcie alertu (wymaga JWT).
- `GET /api/search-history` — historia wyszukiwań użytkownika (wymaga JWT).
- `GET /api/admin/model-stats` — statystyki modelu (rola `admin`).

### ML Service (`http://localhost:8000`)

- `GET /health` — healthcheck.
- `GET /cities` — lista miast z datasetu.
- `POST /predict` — predykcja i czynniki wpływu.
- `GET /stats` — metryki modelu do panelu admina.
