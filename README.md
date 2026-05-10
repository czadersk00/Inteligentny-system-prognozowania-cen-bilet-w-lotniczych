## **1. Temat projektu**
Inteligentny system prognozowania cen biletów lotniczych

## **2. Cel i uzasadnienie**
**Opis problemu:**
Rynek lotniczy opiera się na modelach dynamic pricing, co sprawia że, bilety lotnicze nieustannie zmieniają swoje ceny. Wszystko zależy od popularności kierunku, wyprzedzenia czasowego, czy tego, czy podany termin podróży wypada na święta. Choć budżetowe podróżowanie jest obecnie jednym z najpopularniejszych haseł wśród pasjonatów eksplorowania świata, brak wiedzy o tym, czy dana cena jest faktycznie atrakcyjna, często gubi podróżnych. Nie wiedząc, czy kupować teraz, czy jeszcze się wstrzymać i wrócić do tego później, pasażerowie podejmują nieoptymalne decyzje, co powoduje realne straty finansowe.

**Cel projektu:**
Celem jest opracowanie i implementacja modelu predykcyjnego, który na podstawie danych historycznych oszacuje przyszłą cenę biletu lotniczego. System ma wspierać użytkownika w decyzjach zakupowych, sugerując strategię: "Kup teraz" lub "Czekaj na spadek ceny".

## **3. Analiza ryzyka**

- **Zmienność rynkowa ( Data Drift)**
**_Skutki:_** Model przeszkolony na starych danych przestanie być trafny przy nagłych skokach cen paliw lub inflacji
**_Minimalizacja:_** Regularne dotrenowywanie modelu najnowszymi danymi pobieranymi z rynku
- **Niska jakość danych**
**Skutki:** Błędne rekordy w bazie zaburzą wyniki predykcji i średnią błędu
**Minimalizacja:** Zastosowanie zaawansowanego preprocessingu i automatyczne usuwanie wartości odstających przed treningiem
- **Wyciek danych**
**Skutki:** Uzyskanie nierealistycznie wysokich wyników podczas testów, co przełoży się na całkowitą nieskuteczność modelu w rzeczywistym działaniu.
**Minimalizacja:** Restrykcyjne rozdzielenie zbioru treningowego od testowego oraz dokładna weryfikacja korelacji cech przed procesem uczenia.
- **Błędna interpretacja prognozy przez użytkownika**
**Skutki:** Użytkownik podejmie złą decyzję finansową (np. nie kupi biletu, czekając na spadek, który nie nastąpi), co spowoduje utratę zaufania do aplikacji
**Minimalizacja:** Dodanie w interfejsie wskaźnika "pewności modelu" (np. "Prawdopodobieństwo 80%") oraz jasnych komunikatów, że prognoza jest jedynie sugestią opartą na danych historycznych.
- **Wysokie opóźnienia zewnętrznych API**
**Skutki:** System będzie ładował się bardzo długo, co zniechęci użytkowników do korzystania z aplikacji
**Minimalizacja:** Zastosowanie warstwy cache dla zapytań wyszukiwarki z kilkugodzinnym czasem wygasania, aby nie odpytywać API przy każdym odświeżeniu strony.

## **4. Analiza istniejących rozwiązań**

 **Google Flights** jest rozbudowaną wyszukiwarką lotów, która gromadzi dane o cenach od setek przewoźników i pozwala na ich porównanie w czasie rzeczywistym.

**Hopper** jest aplikacją mobilną wyspecjalizowaną w doradzaniu pasażerom, kiedy najlepiej kupić bilet, aby zaoszczędzić.

| Cecha systemu                                          | Google Flights | Hopper | Moje rozwiązanie |
|--------------------------------------------------------|----------------|--------|------------------|
| Agregacja ofert i historii cen                         | Tak            | Tak    | Tak              |
| Jasna rekomendacja zakupowa (Kup/Czekaj)               | Nie            | Tak    | Tak              |
| Procentowy wskaźnik prawdopodobieństwa                 | Nie            | Tak    | Tak              |
| Wyjaśnienie predykcji, wskazanie kluczowych parametrów | Nie            | Nie    | Tak              |

Mój projekt połączy decyzyjność z przejrzystością. W przeciwieństwie do Google Flights, system zdejmie z użytkownika ciężar analizy i poda konkretną sugestię wraz z procentowym wskaźnikiem prawdopodobieństwa np. 60%. A w odróżnieniu do Hoppera w prosty sposób uzasadni swoją sugestię. W interfejsie zostaną wyświetlone kluczowe czynniki np. "lot w weekend", które miały największy wpływ na model. Dzięki temu użytkownik zrozumie, że prognoza to sugestia na konkretnych danych, co pozwala mu na podjęcie bardziej świadomej decyzji zakupowej.

## **5. Kosztorys**


| Element | Minimalny |Optymalny  |Maksymalny  |
|--|--|--|--|
| Hosting środowiska ML | 0 zł (Azure Free) | 100 zł/mies. | 200 zł/mies. |
| API danych lotniczych | 0 zł (Kaggle/Darmowe) | 200 zł/mies. | 350 zł/mies. |
| Utrzymanie bazy danych | 0 zł (lokalne pliki) | 50 zł/mies. | 150 zł/mies. |
|Płatna licencja narzędzi (IDE)  | 0 zł (VS Code) | 50 zł/mies. | 250 zł/mies. |
| Inne koszty (domena, powiadomienia) | 0 zł | 35 zł/mies. | 160 zł/mies. |
