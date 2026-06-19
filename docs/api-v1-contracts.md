# EnergyOptimizer API v1 — kontrakty dla Home Assistanta i HACS

Kontrakty poniższych endpointów są stabilizowane jako API `1.0`:

```text
GET  /api/v1/schedule/device
POST /api/v1/savings/execution
GET  /api/v1/savings/summary
```

Każda odpowiedź JSON zawiera:

```json
{
  "api_version": "1.0"
}
```

Istniejące pola używane przez konfiguracje YAML pozostają zgodne wstecznie. Dodanie `api_version` i `error_code` nie wymaga zmiany obecnych sensorów Home Assistanta.

Formalny JSON Schema znajduje się w:

```text
contracts/api-v1.schema.json
```

## Wspólny kontrakt błędów

Błędy zachowują tekstowe pole `error` i dodają stabilny kod maszynowy:

```json
{
  "api_version": "1.0",
  "status": "error",
  "error": "Brak autoryzacji.",
  "error_code": "AUTHENTICATION_REQUIRED"
}
```

Dla błędów cyklu urządzenia istniejący status domenowy może pozostać, np. `cancelled`, a `error_code` nadal opisuje kategorię HTTP.

| HTTP | `error_code` | Znaczenie |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Niepoprawne lub brakujące parametry |
| 401 | `AUTHENTICATION_REQUIRED` | Brak nagłówka lub tokenu Bearer |
| 403 | `SUBSCRIPTION_REQUIRED` | Token nieprawidłowy albo brak aktywnego PRO |
| 404 | `NOT_FOUND` | Nie znaleziono cyklu lub zasobu |
| 409 | `CONFLICT` | Niedozwolone przejście stanu |
| 429 | `RATE_LIMITED` | Przekroczony limit zapytań |
| 500 | `INTERNAL_ERROR` | Nieoczekiwany błąd serwera |

Przy HTTP 429 odpowiedź zawiera również `Retry-After: 300`.

## `/api/v1/schedule/device`

Stany odpowiedzi:

- `success` — harmonogram został wyliczony,
- `unfeasible` — wymaganej energii nie da się dostarczyć w podanym oknie,
- `waiting_for_prices` — ceny PSE nie są jeszcze dostępne,
- błąd HTTP — autoryzacja, walidacja, limit lub błąd serwera.

Pola stabilne dla HACS:

```text
api_version
status
timezone
generated_at
date
day
device_name
trigger_automation
recommendation_reason
active_slot
schedule.slots
```

Dla `waiting_for_prices` stabilne są również:

```text
missing_price_dates
retry_after
retry_after_seconds
```

## `/api/v1/savings/execution`

Akcje wejściowe:

```text
start
stop
cancel
```

Stany odpowiedzi:

- `running`,
- `awaiting_prices`,
- `completed`,
- `cancelled`.

Każda poprawna odpowiedź zawiera obiekt `execution` z co najmniej:

```text
execution.execution_id
execution.device_name
```

Pole `idempotent: true` oznacza, że powtórzone żądanie zwróciło istniejący wynik bez utworzenia duplikatu.

Dla `awaiting_prices` stabilne jest:

```text
retry_after_seconds: 300
```

## `/api/v1/savings/summary`

Poprawna odpowiedź ma `status: success` oraz stabilne pola:

```text
currency
timezone
total_savings_pln
total_energy_kwh
total_cycles
month_savings_pln
month_energy_kwh
month_cycles
last_cycle_savings_pln
last_cycle_energy_kwh
last_cycle_device
last_cycle_ended_at
active_executions
running_executions
awaiting_price_executions
updated_at
```

Pola dotyczące ostatniego cyklu i `updated_at` mogą mieć wartość `null`.

## Zasady zmian

W obrębie API 1.0 wolno:

- dodawać nowe opcjonalne pola,
- dodawać nowe wartości diagnostyczne, które nie zmieniają znaczenia istniejących pól,
- poprawiać teksty komunikatów, jeżeli integracja opiera się na `status` i `error_code`.

Zmiana nazwy, typu albo znaczenia pola stabilnego wymaga nowej głównej wersji API lub nowego endpointu.
