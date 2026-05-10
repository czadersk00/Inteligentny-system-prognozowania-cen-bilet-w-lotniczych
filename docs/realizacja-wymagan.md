# Realizacja wymagań (MVP)

Ten dokument opisuje, które wymagania funkcjonalne i niefunkcjonalne zostały zrealizowane w bieżącej iteracji projektu, jakie są odstępstwa oraz dlaczego przyjęto taki zakres. Materiał dowodowy w postaci zrzutów ekranu z aplikacji i narzędzi API znajduje się w dokumentacji projektowej (np. Azure DevOps Wiki).

## 1. Cel iteracji

Celem iteracji jest działające MVP inteligentnego systemu prognozowania cen biletów lotniczych: użytkownik może wyszukać połączenie, otrzymać rekomendację zakupu (`KUP` / `CZEKAJ`) wraz z uzasadnieniem i wskaźnikiem pewności, prowadzić konto oraz korzystać z alertów i historii. Zakres został dobrany tak, aby zamknąć spójny przepływ biznesowy, a integracje wymagające osobnej infrastruktury oddać na kolejne etapy.

## 2. Wymagania funkcjonalne

**WF-01 Rejestracja użytkownika — zrealizowane.**  
Użytkownik zakłada konto przez formularz rejestracji. Nowe konta mają rolę podróżnego (`traveler`).

**WF-02 Logowanie oraz blokada po pięciu błędnych próbach na piętnaście minut — zrealizowane.**  
Logowanie oparte jest o JWT. Po pięciu nieudanych próbach dostępu konto jest tymczasowo blokowane zgodnie z założeniem.

**WF-03 Wyszukiwanie połączenia — zrealizowane.**  
Użytkownik wskazuje miasto wylotu i przylotu oraz datę lotu i uruchamia prognozę.

**WF-04 Generowanie rekomendacji Kup / Czekaj — zrealizowane.**  
System zwraca rekomendację `KUP` albo `CZEKAJ` na podstawie reguł i danych historycznych serwisu ML.

**WF-05 Wskaźnik pewności predykcji — zrealizowane.**  
Przy każdej prognozie wyświetlana jest wartość pewności w skali procentowej.

**WF-06 Analiza prognozy (kilka czynników wpływu) — zrealizowane.**  
Wynik zawiera krótką listę czynników wyjaśniających rekomendację (m.in. kalendarzowe, czas do wylotu, relacja do średnich cen, zmienność).

**WF-07 Zarządzanie alertami cenowymi — zrealizowane.**  
Po zalogowaniu użytkownik może dodać alert dla trasy, przeglądać listę alertów i usuwać je.

**WF-08 Powiadomienia e-mail — nie zrealizowane w MVP.**  
Wymaga integracji z zewnętrzną pocztą i konfiguracji produkcyjnej; funkcja została odłożona na kolejną iterację.

**WF-09 Eksport do pliku CSV — nie zrealizowane w MVP.**  
Nie blokuje głównego scenariusza użytkownika; zaplanowane jako rozszerzenie po stabilizacji MVP.

**WF-10 Panel statystyk modelu dla administratora — zrealizowane.**  
Użytkownik z rolą `admin` widzi zakładkę panelu oraz metryki udostępniane przez serwis ML.

## 3. Wymagania niefunkcjonalne

**WN-01 Predykcja w rozsądnym czasie — zrealizowane lokalnie w MVP.**  
Architektura (lekki warstwowy model + dane wczytywane do pamięci) zapewnia szybkie odpowiedzi przy typowych zapytaniach.

**WN-02 Bezpieczne przechowywanie haseł — zrealizowane.**  
Hasła są haszowane algorytmem bcrypt, nie są przechowywane jako tekst jawny.

**WN-03 Obsługa braku danych i błędów domenowych — zrealizowane.**  
Aplikacja zwraca czytelne komunikaty m.in. przy braku trasy w zbiorze danych lub niedostępności usługi.

**WN-04 Intuicyjny interfejs użytkownika — zrealizowane.**  
Układ ekranów, kolejność kroków oraz formularze zostały zaprojektowane tak, aby użytkownik bez dodatkowej instrukcji mógł wykonać wyszukanie, odebrać prognozę i skorzystać z funkcji konta (logowanie, alerty, historia).

**WN-05 Odporność na błąd komunikacji z modelem ML — zrealizowane.**  
Warstwa API obsługuje niepowodzenie wywołania serwisu ML i przekazuje użytkownikowi informację o problemie.

## 4. Dokumentacja API (Swagger / OpenAPI)

Serwis ML (FastAPI) udostępnia interaktywną dokumentację Swagger pod adresem `http://localhost:8000/docs` oraz automatycznie generowany schemat OpenAPI pod `http://localhost:8000/openapi.json`. Zrzuty ekranu tych widoków stanowią dowód spełnienia wymagania dotyczącego udokumentowanego API.

## 5. Uzasadnienie zakresu realizacji

Zrealizowano wszystkie funkcje niezbędne do pełnego pokazania wartości produktu: od konta użytkownika, przez predykcję z interpretacją, po alerty, historię i podgląd metryk dla administratora. Funkcje `WF-08` i `WF-09` wymagają dodatkowej infrastruktury i kontaktu z zewnętrznymi systemami; ich pominięcie w MVP skraca czas dostarczenia wersji demonstracyjnej bez utraty spójności głównego scenariusza. Szczegółowa dokumentacja projektowa (np. diagramy, pełna lista ekranów dowodowych) może być utrzymywana równolegle w Azure DevOps Wiki.

## 6. Sugerowana lista zrzutów ekranu (dowody)

W materiałach projektowych warto dołączyć co najmniej:

1. Rejestracja i logowanie.  
2. Blokada konta po wielokrotnych błędnych logowaniach.  
3. Formularz wyszukiwania (miasta, data, uruchomienie prognozy).  
4. Wynik: rekomendacja, pewność, czynniki.  
5. Lista i tworzenie alertów.  
6. Historia wyszukiwań.  
7. Panel administratora.  
8. Swagger UI (`/docs`) i ewentualnie fragment `openapi.json`.
Cel biznesowy i edukacyjny. Projekt realizuje klasyczny MVP systemu doradczego: użytkownik wykonuje wyszukanie (WF-03), otrzymuje jasną decyzję zakupową oraz kontekst (WF-04–WF-06), może zabezpieczyć kolejny krok cenowy alertami (WF-07), a administrator widzi jakość uproszczonego komponentu modelowego (WF-10). Taki zestaw funkcji demonstruje spięcie frontendu, API, uwierzytelnienia i usługi analitycznej w jednym spójnym przepływie.

Priorytet zgodny z ważnością wymagań. Elementy oznaczone jako wysokie zostały uwzględnione jako rdzeń produktu, bo bez nich aplikacja nie spełnia podstawowego celu (prognoza + interpretacja). Elementy niższego lub średniego priorytetu zostały realizowanie selektywnie: wdrożyłam funkcje, które da się zakończyć w ramach aplikacji webowej bez dodatkowych usług i umów poza repozytorium.

Ryzyko i koszt integracji. WF-08 (powiadomienia e-mail) oraz WF-09 (eksport CSV) wymagają kolejnego „obwodu” produkcyjnego: kolejki zadań lub crona dla maili, szablonów wiadomości, dostawcy poczty oraz polityki danych, a w przypadku CSV — eksportów serwerowych, uprawnień i testów jakości plików. W ramach MVP priorytetem było nie opóźniać dostarczenia działającego przepływu użytkownika.

Transparentność i bezpieczeństwo użytkownika. Rozważenia niefunkcjonalne zostały uwzględnione jako warunek przyjęcia MVP: uwierzytelnienie JWT, blokada brute-force przy logowaniu, haszowanie haseł, obsługa błędów braku danych i niedostępności usług oraz udokumentowany kontrakt API (Swagger/OpenAPI). To pokrywa krytyczny „fundament”, na którym można później dobudować WF-08 i WF-09.