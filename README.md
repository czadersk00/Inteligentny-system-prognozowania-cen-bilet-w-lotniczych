# Inteligentny system prognozowania cen biletow lotniczych

Aplikacja MVP do analizy cen lotow i rekomendacji zakupu (`KUP` / `CZEKAJ`).

Stack:
- frontend: React 18 + Vite
- backend: Node.js (Express)
- model predykcji: Python (FastAPI)
- baza: PostgreSQL 15 (w `docker-compose`)

## Szybki start

1. Skopiuj zmienne srodowiskowe:

```bash
Copy-Item .env.example .env
```

2. Uruchom uslugi:

```bash
docker compose up --build
```

3. Otworz aplikacje:
- frontend: `http://localhost:5173`
- backend health: `http://localhost:3000/health`
- Swagger (ML): `http://localhost:8000/docs`

## MVP (zakres)

- rejestracja i logowanie (JWT),
- blokada po 5 blednych logowaniach na 15 minut,
- predykcja ceny i rekomendacja `KUP` / `CZEKAJ`,
- czynniki wplywajace na decyzje modelu,
- alerty cenowe i historia wyszukiwan,
- panel statystyk modelu dla roli `admin`.

## Dokumentacja

- dokumentacja techniczna: `docs/techniczna.md`
- realizacja wymagań (MVP): `docs/realizacja-wymagan.md`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Uwagi

- W MVP dane domenowe sa trzymane in-memory po stronie backendu.
- Pelna dokumentacja projektowa jest prowadzona w Azure DevOps.
