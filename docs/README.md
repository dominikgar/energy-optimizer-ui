# Dokumentacja EnergyOptimizer

## Użytkownik i Home Assistant

- [`device-executions-home-assistant.md`](device-executions-home-assistant.md) — raportowanie rzeczywistego startu i końca urządzeń z Home Assistanta.
- [`realized-savings.md`](realized-savings.md) — model obliczania zrealizowanych oszczędności.
- [`dashboards.md`](dashboards.md) — przeznaczenie, dane i interpretacja dashboardów Oszczędności oraz Diagnostyki.

## Administrator i utrzymanie

- [`monitoring.md`](monitoring.md) — aktywacja audytu zdarzeń i panelu `/admin/diagnostics`.
- [`release-checklist.md`](release-checklist.md) — lista kontrolna wdrożenia, jeżeli jest używana w danej wersji repozytorium.

## Publiczna pomoc w aplikacji

Opis obu dashboardów jest również dostępny dla użytkownika pod adresem:

```text
/dashboardy
```

Generator konfiguracji raportowania oszczędności znajduje się w aplikacji w sekcji:

```text
API automatyzacji → Raportowanie faktycznych oszczędności
```

Po każdym wdrożeniu warto sprawdzić publiczną stronę `/dashboardy`, panel użytkownika `/savings` oraz panel administratora `/admin/diagnostics`.
