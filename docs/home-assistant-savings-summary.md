# Podsumowanie oszczędności w Home Assistant

## Cel

EnergyOptimizer pozostaje źródłem prawdy dla historii cykli i obliczeń kosztów. Home Assistant otrzymuje tylko lekkie encje podsumowujące, które można umieścić na lokalnym dashboardzie i wykorzystać w automatyzacjach.

Pełna historia pozostaje pod adresem:

```text
/savings
```

## Endpoint

```text
GET https://www.energyoptimizer.pl/api/v1/savings/summary
Authorization: Bearer <TOKEN>
```

Endpoint wymaga aktywnej subskrypcji PRO i zwraca m.in.:

```json
{
  "status": "success",
  "currency": "PLN",
  "timezone": "Europe/Warsaw",
  "total_savings_pln": 23.41,
  "total_energy_kwh": 48.6,
  "total_cycles": 31,
  "month_savings_pln": 7.22,
  "month_energy_kwh": 18.6,
  "month_cycles": 12,
  "last_cycle_savings_pln": 0.41,
  "last_cycle_energy_kwh": 1.5,
  "last_cycle_device": "dishwasher",
  "last_cycle_ended_at": "2026-06-18T13:45:00.000Z",
  "active_executions": 0,
  "running_executions": 0,
  "awaiting_price_executions": 0,
  "updated_at": "2026-06-18T13:45:01.000Z"
}
```

## Generator w aplikacji

Kod konfiguracji znajduje się w:

```text
API automatyzacji → Sensory podsumowania oszczędności
```

Generator zwraca pojedynczy element listy przeznaczony do istniejącej sekcji:

```yaml
rest:
```

Nie należy tworzyć drugiego nagłówka `rest:`. Wygenerowany blok trzeba wkleić obok istniejącego wpisu harmonogramu.

## Tworzone encje

Generator tworzy sensory:

```text
sensor.eo_savings_total
sensor.eo_savings_this_month
sensor.eo_shifted_energy_total
sensor.eo_shifted_energy_this_month
sensor.eo_completed_cycles_total
sensor.eo_completed_cycles_this_month
sensor.eo_last_cycle_savings
sensor.eo_last_cycle_device
sensor.eo_active_executions
```

oraz binary sensory:

```text
binary_sensor.eo_execution_active
binary_sensor.eo_savings_waiting_for_prices
```

## Częstotliwość odświeżania

Domyślne odświeżanie wynosi:

```text
900 sekund, czyli 15 minut
```

To daje maksymalnie około 96 wywołań na dobę dla jednej instalacji Home Assistanta. Generator nie pozwala ustawić interwału krótszego niż 300 sekund.

Endpoint wykonuje jedno skompaktowane zapytanie agregujące. Aktualizacja pola `access_token_last_used_at` jest ograniczona do najwyżej jednego zapisu na 15 minut, aby nie generować niepotrzebnych zapisów w PostgreSQL.

## Dlaczego bez pełnej historii w atrybutach

Pełna lista cykli nie jest przesyłana do Home Assistanta. Często zmieniające się, rozbudowane atrybuty byłyby wielokrotnie zapisywane przez Recorder i niepotrzebnie zwiększałyby lokalną bazę HA.

Zamiast tego:

- pojedyncze wartości są osobnymi encjami,
- pełna historia pozostaje w `/savings`,
- sensory łączne mogą korzystać ze statystyk długoterminowych,
- Home Assistant może budować własne karty i powiadomienia na podstawie krótkiego podsumowania.

## Podział odpowiedzialności

| EnergyOptimizer | Home Assistant |
|---|---|
| zapis historii cykli | bieżący podgląd najważniejszych liczb |
| obliczenia kosztów i oszczędności | własne karty i automatyzacje |
| analityka miesięczna i według urządzeń | lokalne powiadomienia |
| kontrola subskrypcji i API | odpytywanie endpointu co określony czas |

## Minimalny test

1. Włącz raportowanie `start/stop` dla urządzenia.
2. Zakończ przynajmniej jeden cykl.
3. Otwórz `/savings` i sprawdź zapisany raport.
4. Wklej konfigurację sensorów pod istniejącą sekcję `rest:`.
5. Sprawdź konfigurację Home Assistanta i wykonaj restart.
6. W Narzędziach deweloperskich wyszukaj encje zaczynające się od `eo_savings` oraz `eo_shifted_energy`.
