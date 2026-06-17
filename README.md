# EnergyOptimizer

Aplikacja Next.js do analizy godzinowego zużycia energii, porównywania go z publicznymi cenami RCE PSE oraz udostępniania rekomendowanych okien czasowych do Home Assistanta.

## Zakres produktu

- import historii zużycia z plików CSV,
- wykres profilu zużycia,
- kalkulator konfigurowalnej oferty dynamicznej,
- konfigurowalny model wspólnych opłat dystrybucyjnych,
- radar cen PSE na dziś i jutro,
- planer pracy bojlera, EV i innych odbiorników,
- płatny dostęp PRO przez Stripe,
- API dla Home Assistanta.

## Model kosztowy

### Sprzedaż energii

Silnik sprzedaży znajduje się w `lib/costEngine.ts`.

Koszt oferty dynamicznej jest liczony jako:

```text
koszt rynkowy
+ marża za kWh
+ dodatkowa opłata zmienna za kWh
+ proporcjonalna część opłaty miesięcznej
+ wskazany VAT
```

Koszt rynkowy może korzystać z:

```text
RCE × mnożnik sprzedawcy
```

Użytkownik określa także, czy ujemne ceny RCE są przekazywane klientowi, czy sprzedawca stosuje minimalną cenę 0 PLN/kWh.

Stawka G11 przechowywana w tabeli `energy_tariffs` jest traktowana jako skonfigurowana stawka porównawcza za kWh.

### Dystrybucja

Model dystrybucji znajduje się w `lib/distributionCost.ts` i obsługuje:

```text
zmienną opłatę dystrybucyjną za kWh
+ inne zmienne opłaty za kWh
+ proporcjonalną część stałych opłat miesięcznych
+ proporcjonalną część opłaty mocowej
+ wskazany VAT
```

Dystrybucja jest dodawana identycznie do G11 i wariantu dynamicznego. Dzięki temu kalkulator pokazuje bardziej realistyczną sumę rachunku, ale wspólne opłaty nie zmieniają różnicy pomiędzy ofertami sprzedaży.

## Planer urządzeń

Silnik harmonogramowania znajduje się w `lib/deviceScheduler.ts`.

Obsługiwane ograniczenia:

```text
wymagana energia [kWh]
maksymalna moc urządzenia [kW]
najwcześniejsza godzina uruchomienia
najpóźniejsza godzina zakończenia
praca ciągła albo przerywana
```

Dla pracy ciągłej silnik wyszukuje najtańsze kolejne interwały. Dla pracy przerywanej wybiera najtańsze dostępne interwały w całym oknie czasowym. Wynik zawiera harmonogram, dostarczoną energię, koszt RCE, średnią cenę oraz czas pracy.

## Dane PSE

Wspólny klient i parser znajdują się w `lib/pse.ts`. Z tego samego kodu korzystają:

- Radar cenowy,
- Planer urządzeń,
- API Home Assistanta.

Obsługiwane są dane godzinowe i 15-minutowe oraz dwa warianty filtrowania API PSE: `business_date` i starsze `doba`.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Wymagane zmienne środowiskowe

```text
DATABASE_URL
NEXT_PUBLIC_BASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

## Najważniejsze tabele

### `energy_consumption`

Historia zużycia przypisana do użytkownika.

Wymagane pola:

```text
user_id
timestamp
value_kwh
type
```

Wymagane ograniczenie unikalności:

```text
UNIQUE (user_id, timestamp)
```

### `energy_prices`

Publiczne ceny RCE PSE.

```text
timestamp
price_pln_mwh
```

### `energy_tariffs`

Stawki porównawcze G11.

```text
tariff_name
price_per_kwh
description
```

### `user_subscriptions`

Stan subskrypcji Stripe i dostęp do API.

## Bezpieczeństwo

- import CSV ma limit 10 MB,
- wymiana danych użytkownika odbywa się w jednej transakcji PostgreSQL,
- dane PRO są pobierane dopiero po serwerowej weryfikacji subskrypcji,
- webhook Stripe jest weryfikowany podpisem,
- API Home Assistanta sprawdza aktywność subskrypcji i datę jej ważności.

## Ograniczenia

- aplikacja nie posiada jeszcze zweryfikowanych presetów konkretnych ofert sprzedawców i OSD,
- użytkownik musi sam przepisać stawki z aktualnego cennika lub faktury,
- formaty CSV operatorów są nadal rozpoznawane heurystycznie,
- kalkulator nie obsługuje jeszcze wielostrefowych taryf dystrybucyjnych,
- planer nie steruje jeszcze fizycznie urządzeniami i nie uwzględnia sprawności, strat cieplnych ani stanu baterii,
- harmonogram obejmuje jedną dobę i nie planuje okien przechodzących przez północ,
- klucze API wymagają w przyszłości haszowania, rotacji i rate limitingu.
