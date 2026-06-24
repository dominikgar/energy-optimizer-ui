# EnergyOptimizer HACS MVP

Ten pakiet dodaje pierwszy natywny komponent Home Assistanta dla EnergyOptimizer.

## Zakres MVP

Integracja tworzy konfigurację przez UI Home Assistanta i korzysta z ustabilizowanych endpointów API v1:

```text
GET  /api/v1/schedule/device
GET  /api/v1/savings/summary
POST /api/v1/savings/execution
```

Cykle `start`, `stop` i `cancel` są dostępne jako natywne usługi Home Assistanta.

## Struktura HACS

```text
custom_components/energy_optimizer/__init__.py
custom_components/energy_optimizer/api.py
custom_components/energy_optimizer/binary_sensor.py
custom_components/energy_optimizer/config_flow.py
custom_components/energy_optimizer/const.py
custom_components/energy_optimizer/coordinator.py
custom_components/energy_optimizer/diagnostics.py
custom_components/energy_optimizer/manifest.json
custom_components/energy_optimizer/sensor.py
custom_components/energy_optimizer/services.py
custom_components/energy_optimizer/services.yaml
custom_components/energy_optimizer/strings.json
custom_components/energy_optimizer/translations/en.json
custom_components/energy_optimizer/translations/pl.json
hacs.json
```

## Konfiguracja w Home Assistant

W formularzu konfiguracji podajesz:

```text
EnergyOptimizer URL
API token
Device name
Required energy [kWh]
Maximum power [kW]
Earliest start HH:MM
Latest end HH:MM
Require continuous operation
```

Domyślne wartości są ustawione pod bojler:

```text
device_name = boiler
energy_kwh = 6.0
power_kw = 2.0
earliest_start = 00:00
latest_end = 07:00
contiguous = true
```

## Encje

Integracja tworzy sensory:

```text
schedule_status
current_price
schedule_total_cost
schedule_average_price
total_savings
month_savings
total_energy
month_energy
active_executions
```

Tworzy też binary sensor:

```text
trigger_automation
```

`trigger_automation` jest odpowiednikiem dotychczasowego pola `trigger_automation` z YAML i pokazuje, czy skonfigurowane urządzenie powinno pracować teraz.

## Usługi

Integracja rejestruje trzy usługi:

```text
energy_optimizer.start_execution
energy_optimizer.stop_execution
energy_optimizer.cancel_execution
```

### `start_execution`

Minimalne wywołanie:

```yaml
service: energy_optimizer.start_execution
data:
  reference_rate_pln_kwh: 0.85
```

Opcjonalnie można przekazać:

```yaml
service: energy_optimizer.start_execution
data:
  device_name: boiler
  reference_rate_pln_kwh: 0.85
  meter_start_kwh: 1234.56
  power_kw: 2.0
```

### `stop_execution`

Minimalnie można zakończyć ostatni cykl skonfigurowanego urządzenia:

```yaml
service: energy_optimizer.stop_execution
```

Z licznikiem energii:

```yaml
service: energy_optimizer.stop_execution
data:
  device_name: boiler
  meter_end_kwh: 1236.12
```

Można też wskazać `execution_id`, jeżeli automatyzacja przechowuje identyfikator zwrócony przez API.

### `cancel_execution`

```yaml
service: energy_optimizer.cancel_execution
data:
  device_name: boiler
  reason: Anulowano ręcznie w Home Assistant
```

Jeżeli w Home Assistant istnieje więcej niż jeden wpis EnergyOptimizer, przekaż `entry_id` albo `device_name`, aby wskazać właściwą konfigurację.

Po każdym wywołaniu integracja emituje zdarzenie:

```text
energy_optimizer_execution_service
```

Zdarzenie zawiera `service`, `status`, `execution_id`, `device_name`, `idempotent`, `api_version` i `error_code`, jeśli te dane są dostępne.

## Polling

Integracja używa `DataUpdateCoordinator` i odświeża dane co 5 minut. Jeden cykl pobiera harmonogram urządzenia i podsumowanie oszczędności.

## Bezpieczeństwo

Token API jest przechowywany w config entry i ukrywany w diagnostyce przez `async_redact_data`. Diagnostyka pokazuje status ostatnich odpowiedzi API, ale nie pokazuje tokenu.

## Następne kroki

- dodać option flow do zmiany parametrów urządzenia bez usuwania integracji,
- dodać testy `pytest-homeassistant-custom-component`,
- przygotować osobne repozytorium HACS albo wydzielić katalog integracji do repo zgodnego z HACS,
- dodać brand assets, minimum `brands/energy_optimizer/icon.png`.
