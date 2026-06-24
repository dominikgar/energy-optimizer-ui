# EnergyOptimizer HACS MVP

Ten pakiet dodaje pierwszy natywny komponent Home Assistanta dla EnergyOptimizer.

## Zakres MVP

Integracja tworzy konfigurację przez UI Home Assistanta i korzysta z ustabilizowanych endpointów API v1:

```text
GET  /api/v1/schedule/device
GET  /api/v1/savings/summary
POST /api/v1/savings/execution
```

W tym PR cykle `start`, `stop` i `cancel` są zaimplementowane w kliencie API, ale nie mają jeszcze osobnych usług Home Assistanta. To cel następnego pakietu.

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

## Polling

Integracja używa `DataUpdateCoordinator` i odświeża dane co 5 minut. Jeden cykl pobiera harmonogram urządzenia i podsumowanie oszczędności.

## Bezpieczeństwo

Token API jest przechowywany w config entry i ukrywany w diagnostyce przez `async_redact_data`. Diagnostyka pokazuje status ostatnich odpowiedzi API, ale nie pokazuje tokenu.

## Następne kroki

- dodać usługi Home Assistanta: `start_execution`, `stop_execution`, `cancel_execution`,
- dodać option flow do zmiany parametrów urządzenia bez usuwania integracji,
- dodać testy `pytest-homeassistant-custom-component`,
- przygotować osobne repozytorium HACS albo wydzielić katalog integracji do repo zgodnego z HACS,
- dodać brand assets, minimum `brands/energy_optimizer/icon.png`.
