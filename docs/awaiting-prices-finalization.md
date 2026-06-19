# Automatyczna finalizacja `awaiting_prices`

Cykl zatrzymany przed pojawieniem się cen PSE pozostaje w stanie `awaiting_prices`. Dane końca cyklu i zużytej energii są już zapisane, dlatego użytkownik nie musi ponownie wysyłać akcji `stop`.

## Sposoby uruchomienia finalizacji

1. `GET /api/v1/savings/summary` próbuje zakończyć maksymalnie pięć oczekujących cykli zalogowanego użytkownika. Home Assistant regularnie odświeża ten sensor, więc jest to podstawowa ścieżka szybkiej finalizacji.
2. `GET /api/cron/finalize-savings` wykonuje dzienny przebieg awaryjny dla wszystkich użytkowników. Endpoint wymaga nagłówka `Authorization: Bearer <CRON_SECRET>`.

Kolejne próby dla tego samego cyklu są wykonywane nie częściej niż raz na pięć minut.

## Konfiguracja produkcyjna

1. Uruchom migrację:

```text
migrations/20260619_device_execution_finalization.sql
```

2. Dodaj w Vercelu zmienną środowiskową `CRON_SECRET` z losową wartością o długości co najmniej 16 znaków.
3. Wdróż projekt. Harmonogram z `vercel.json` wywoła endpoint raz dziennie.

## Idempotencja

- rekord wykonania jest blokowany przez `FOR UPDATE SKIP LOCKED`,
- raport używa istniejącego ograniczenia unikalności i `ON CONFLICT`,
- po finalizacji stan wykonania zmienia się na `completed`,
- ponowne lub równoległe próby nie powinny utworzyć drugiego raportu.

## Diagnostyka

Pomyślne automatyczne zakończenie zapisuje zdarzenie `execution.auto_completed`. Błędy zapisują `execution.finalization_failed`, a błąd całego przebiegu cron zapisuje `execution.finalization_batch_failed`.
