# Raportowanie rzeczywistych oszczędności

## Migracja

Przed włączeniem endpointu uruchom w Neon SQL Editor:

```text
migrations/20260617_energy_savings_reports.sql
```

## Zapis wykonanego cyklu

```text
POST /api/v1/savings/report
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Przykładowe body:

```json
{
  "device_name": "boiler",
  "started_at": "2026-06-17T22:00:00+02:00",
  "ended_at": "2026-06-18T01:00:00+02:00",
  "energy_kwh": 6,
  "reference_rate_pln_kwh": 0.85,
  "source": "home_assistant"
}
```

Serwer pobiera ceny PSE z tabeli `energy_prices`, wylicza średnią dla raportowanego okresu i porównuje koszt z podaną stawką odniesienia.

Raport dotyczy komponentu energii. Nie obejmuje dystrybucji, abonamentu ani innych opłat faktury.

## Historia

```text
GET /api/v1/savings/report?limit=30
Authorization: Bearer <API_KEY>
```

Odpowiedź zawiera podsumowanie i listę ostatnich raportów.

## Założenie

Koszt rzeczywisty jest szacowany przy założeniu równomiernego zużycia energii w podanym przedziale czasu. Dokładniejsze rozliczenie będzie możliwe po raportowaniu energii osobno dla każdego interwału.
