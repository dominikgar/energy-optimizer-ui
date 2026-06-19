# Rejestrowanie wykonań z Home Assistanta

## Migracje

Przed wdrożeniem uruchom w Neon:

```text
migrations/20260618_device_executions.sql
migrations/20260619_device_execution_finalization.sql
migrations/20260619_execution_lifecycle.sql
```

## Endpoint

```text
POST https://www.energyoptimizer.pl/api/v1/savings/execution
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Obsługiwane akcje:

```text
start
stop
cancel
```

Dla jednego użytkownika i urządzenia może istnieć tylko jeden aktywny cykl.

## Idempotencja

Automatyzacje Home Assistanta mogą powtórzyć wywołanie po restarcie lub problemie sieciowym:

- ponowny `start` zwraca istniejący aktywny cykl z `idempotent: true`,
- ponowny `stop` zakończonego cyklu zwraca poprzedni raport z `idempotent: true`,
- ponowne `cancel` zwraca istniejący stan anulowania.

Powtórzone żądania nie powinny tworzyć drugiego raportu.

## Home Assistant — konfiguracja z licznikiem energii

W `secrets.yaml`:

```yaml
energyoptimizer_authorization: "Bearer TWÓJ_PEŁNY_TOKEN"
```

W `configuration.yaml`:

```yaml
rest_command:
  energyoptimizer_dishwasher_start:
    url: "https://www.energyoptimizer.pl/api/v1/savings/execution"
    method: POST
    headers:
      Authorization: !secret energyoptimizer_authorization
      Content-Type: "application/json"
    payload: >-
      {
        "action": "start",
        "device_name": "dishwasher",
        "reference_rate_pln_kwh": 0.85,
        "meter_start_kwh": {{ states('sensor.dishwasher_energy_total') | float(0) }},
        "source": "home_assistant"
      }

  energyoptimizer_dishwasher_stop:
    url: "https://www.energyoptimizer.pl/api/v1/savings/execution"
    method: POST
    headers:
      Authorization: !secret energyoptimizer_authorization
      Content-Type: "application/json"
    payload: >-
      {
        "action": "stop",
        "device_name": "dishwasher",
        "meter_end_kwh": {{ states('sensor.dishwasher_energy_total') | float(0) }},
        "source": "home_assistant"
      }

  energyoptimizer_dishwasher_cancel:
    url: "https://www.energyoptimizer.pl/api/v1/savings/execution"
    method: POST
    headers:
      Authorization: !secret energyoptimizer_authorization
      Content-Type: "application/json"
    payload: >-
      {
        "action": "cancel",
        "device_name": "dishwasher",
        "reason": "Anulowano ręcznie w Home Assistant",
        "source": "home_assistant"
      }
```

Podmień encję:

```text
sensor.dishwasher_energy_total
```

na własny licznik energii rosnący w kWh.

Polecenie `cancel` można wywołać ręcznie z Narzędzi deweloperskich Home Assistanta, gdy urządzenie nie wystartowało, pomiar został przerwany albo sesja zawisła.

## Home Assistant — fallback bez licznika

Jeżeli urządzenie nie ma licznika, podczas startu można podać moc:

```yaml
rest_command:
  energyoptimizer_dishwasher_start_estimated:
    url: "https://www.energyoptimizer.pl/api/v1/savings/execution"
    method: POST
    headers:
      Authorization: !secret energyoptimizer_authorization
      Content-Type: "application/json"
    payload: >-
      {
        "action": "start",
        "device_name": "dishwasher",
        "reference_rate_pln_kwh": 0.85,
        "power_kw": 1.0,
        "source": "home_assistant"
      }

  energyoptimizer_dishwasher_stop_estimated:
    url: "https://www.energyoptimizer.pl/api/v1/savings/execution"
    method: POST
    headers:
      Authorization: !secret energyoptimizer_authorization
      Content-Type: "application/json"
    payload: >-
      {
        "action": "stop",
        "device_name": "dishwasher",
        "source": "home_assistant"
      }
```

Energia zostanie wtedy oszacowana jako:

```text
power_kw × czas cyklu
```

Raport będzie oznaczony jako estymowany.

## Przykładowe automatyzacje

```yaml
automation:
  - alias: "EO - raport startu zmywarki"
    trigger:
      - platform: state
        entity_id: switch.dishwasher
        to: "on"
    action:
      - service: rest_command.energyoptimizer_dishwasher_start

  - alias: "EO - raport końca zmywarki"
    trigger:
      - platform: state
        entity_id: switch.dishwasher
        to: "off"
        for: "00:01:00"
    action:
      - service: rest_command.energyoptimizer_dishwasher_stop
```

Wyzwalacz powinien opierać się na rzeczywistym stanie urządzenia lub poborze mocy, a nie wyłącznie na rekomendacji `binary_sensor.eo_dishwasher_should_run`.

## Oczekiwanie na ceny

Jeżeli cykl się zakończył, ale w tabeli `energy_prices` nie ma jeszcze cen dla danego okresu, endpoint zwraca HTTP `202`:

```json
{
  "status": "awaiting_prices",
  "retry_after_seconds": 300
}
```

Nie trzeba ponownie wysyłać `stop`. Cykl jest automatycznie finalizowany:

1. podczas kolejnych odświeżeń sensora `/api/v1/savings/summary`,
2. przez chroniony job okresowy jako ścieżkę awaryjną.

## Zbyt stare sesje

Sesja `running` starsza niż 48 godzin jest domyślnie automatycznie anulowana. Limit można zmienić zmienną środowiskową:

```text
EXECUTION_MAX_RUNNING_HOURS=48
```

Dozwolony zakres wynosi od 1 do 720 godzin. Anulowany cykl nie tworzy raportu oszczędności, ale przez 7 dni jest widoczny na dashboardzie wraz z przyczyną.

## Kolejność wyznaczania energii

1. `energy_kwh` przekazane przy akcji `stop`.
2. Różnica `meter_end_kwh - meter_start_kwh`.
3. Estymacja `power_kw × czas`.

## Podgląd wyników

Po zapisaniu pierwszych cykli wyniki są dostępne w aplikacji pod adresem:

```text
https://www.energyoptimizer.pl/savings
```

Widok pokazuje oszczędność łączną i miesięczną, koszt rzeczywisty, energię, wyniki według urządzeń, historię wykonań oraz czytelne statusy aktywnych, oczekujących i anulowanych cykli.
