# Checklist wdrożenia cyklu urządzeń

## Baza danych

Uruchom:

```text
migrations/20260619_execution_lifecycle.sql
```

Migracja dodaje wyłącznie częściowy indeks dla starych sesji `running`.

## Zmienne środowiskowe

Opcjonalnie ustaw:

```text
EXECUTION_MAX_RUNNING_HOURS=48
```

Brak zmiennej oznacza domyślny limit 48 godzin. Dozwolony zakres: 1–720.

## Test akceptacyjny

1. Wyślij `start` dwa razy dla tego samego urządzenia — drugie wywołanie powinno zwrócić `idempotent: true`.
2. Wyślij `stop` — cykl powinien przejść do `completed` albo `awaiting_prices`.
3. Wyślij `stop` ponownie — nie powinien powstać drugi raport.
4. Rozpocznij nowy cykl i wyślij `cancel` — cykl powinien otrzymać status `cancelled`.
5. Wyślij `cancel` ponownie — odpowiedź powinna zawierać `idempotent: true`.
6. Sprawdź `/savings`: statusy powinny być po polsku, a anulowanie lub błąd finalizacji powinny zawierać przyczynę.
