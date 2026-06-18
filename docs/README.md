# Dokumentacja EnergyOptimizer

## Użytkownik i Home Assistant

- [`device-executions-home-assistant.md`](device-executions-home-assistant.md) — raportowanie rzeczywistego startu i końca urządzeń z Home Assistanta.
- [`home-assistant-savings-summary.md`](home-assistant-savings-summary.md) — lekkie sensory oszczędności i aktywnych cykli dla Home Assistanta.
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

Generatory konfiguracji znajdują się w aplikacji w sekcjach:

```text
API automatyzacji → Raportowanie faktycznych oszczędności
API automatyzacji → Sensory podsumowania oszczędności
```

Po każdym wdrożeniu warto sprawdzić publiczną stronę `/dashboardy`, panel użytkownika `/savings`, ekran API automatyzacji, endpoint `/api/v1/savings/summary` oraz panel administratora `/admin/diagnostics`.
