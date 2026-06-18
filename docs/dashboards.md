# Dashboardy EnergyOptimizer

EnergyOptimizer ma dwa odrębne dashboardy. Nie służą do tego samego i są przeznaczone dla innych odbiorców.

## Dashboard Oszczędności

Adres:

```text
/savings
```

### Dla kogo

Dashboard jest funkcją użytkownika końcowego w pakiecie PRO. Jest przeznaczony dla osoby, która korzysta z API automatyzacji oraz Home Assistanta i chce sprawdzić, czy urządzenia faktycznie pracowały w korzystniejszych cenowo godzinach.

Nie jest to panel administracyjny.

### Co odpowiada

Dashboard ma odpowiedzieć na pytanie:

> Czy wykonane automatyzacje rzeczywiście obniżyły koszt energii rynkowej?

Pokazuje:

- liczbę zakończonych cykli urządzeń,
- energię wykorzystaną przez zgłoszone cykle,
- koszt energii rynkowej podczas rzeczywistej pracy,
- koszt odniesienia wyliczony według podanej stawki,
- różnicę, czyli osiągniętą oszczędność albo stratę,
- wyniki łączne i miesięczne,
- wyniki według urządzenia,
- historię ostatnich wykonań,
- informację, czy energia pochodzi z licznika, jawnego raportu czy estymacji `moc × czas`.

### Skąd pochodzą dane

Sam harmonogram urządzenia nie tworzy wpisu w dashboardzie. Home Assistant musi zgłosić:

1. rzeczywisty start urządzenia,
2. rzeczywisty koniec urządzenia,
3. zużytą energię albo dane umożliwiające jej wyliczenie.

Do raportowania służy endpoint:

```text
POST /api/v1/savings/execution
```

oraz generator w sekcji **API automatyzacji → Raportowanie faktycznych oszczędności**.

### Sposoby ustalenia energii

Serwer stosuje kolejność:

1. wartość `energy_kwh` podana przy zakończeniu cyklu,
2. różnica licznika `meter_end_kwh - meter_start_kwh`,
3. estymacja `power_kw × czas cyklu`.

Estymowane wyniki są oznaczone w dashboardzie.

### Stawka odniesienia

`reference_rate_pln_kwh` jest ceną, z którą użytkownik chce porównać rzeczywisty koszt rynkowy cyklu. Może to być np. cena energii czynnej z taryfy stałej albo przyjęta cena uruchomienia bez optymalizacji.

Stawka nie powinna być przedstawiana jako pełny koszt rachunku, jeśli nie zawiera dystrybucji, podatków, marży i opłat stałych.

### Ograniczenia interpretacji

Dashboard liczy efekt na podstawie cen i danych przekazanych dla cyklu. Nie dowodzi samodzielnie, że cały rachunek za energię spadł o pokazaną kwotę.

W szczególności:

- koszt rynkowy może nie obejmować wszystkich składników faktury,
- wynik zależy od poprawności encji Home Assistanta,
- estymacja z mocy jest mniej dokładna niż licznik kWh,
- błędna stawka odniesienia prowadzi do błędnej oszczędności,
- cykl uruchomiony poza rekomendacją również może zostać zaraportowany.

### Statusy sesji

- `running` — urządzenie rozpoczęło pracę, ale nie zgłosiło jeszcze końca,
- `awaiting_prices` — cykl się zakończył, lecz brakuje próbek cen dla danego okresu,
- `completed` — raport został wyliczony i zapisany,
- `cancelled` — sesja została anulowana.

## Dashboard Diagnostyki

Adres:

```text
/admin/diagnostics
```

### Dla kogo

Dashboard jest przeznaczony wyłącznie dla administratora aplikacji. Dostęp jest kontrolowany przez zmienną środowiskową:

```text
ADMIN_USER_IDS
```

Zwykły użytkownik PRO nie powinien mieć do niego dostępu.

### Co odpowiada

Dashboard ma odpowiedzieć na pytanie:

> Czy aplikacja, integracje i subskrypcje działają prawidłowo?

Pokazuje:

- liczbę zdarzeń z ostatnich 24 godzin,
- błędy i zdarzenia krytyczne,
- ostrzeżenia,
- nierozwiązane błędy,
- źródła zdarzeń,
- ostatnie komunikaty diagnostyczne,
- niespójne rekordy subskrypcji PRO.

### Źródła zdarzeń

Przykładowe wartości pola `source`:

- `csv-import` — import historii zużycia,
- `pse-forecast` — pobieranie cen lub prognoz PSE,
- `device-api` — wywołania API harmonogramu urządzeń,
- `savings-execution` — start, stop i finalizacja raportu oszczędności,
- `stripe-webhook` — obsługa zdarzeń płatności, jeżeli audyt jest włączony.

### Poziomy zdarzeń

- `info` — prawidłowe zdarzenie operacyjne,
- `warning` — problem użytkownika, brak danych lub odrzucone żądanie,
- `error` — błąd wykonania funkcji,
- `critical` — błąd wymagający pilnej kontroli, np. nieprzetworzony webhook płatności.

### Bezpieczeństwo

Panel nie powinien prezentować pełnych tokenów, nagłówków autoryzacji, haseł ani treści przesłanych plików. Logger sanitizuje metadane przed zapisem.

## Różnica między dashboardami

| Cecha | Oszczędności | Diagnostyka |
|---|---|---|
| Odbiorca | użytkownik PRO | administrator |
| Cel | ocena efektu automatyzacji | kontrola działania systemu |
| Dane | cykle urządzeń i koszty | zdarzenia, błędy, subskrypcje |
| Dostęp | aktywna subskrypcja PRO | Clerk User ID na liście administratorów |
| Adres | `/savings` | `/admin/diagnostics` |

## Minimalny test po wdrożeniu

### Oszczędności

1. Wygeneruj konfigurację start/stop w API automatyzacji.
2. Uruchom akcję start dla urządzenia.
3. Sprawdź, czy w `/savings` pojawia się cykl `running`.
4. Uruchom akcję stop.
5. Sprawdź raport `completed` albo `awaiting_prices`.

### Diagnostyka

1. Otwórz `/admin/diagnostics` jako administrator.
2. Wywołaj endpoint harmonogramu lub import CSV.
3. Odśwież panel.
4. Sprawdź źródło, status i czas zdarzenia.
