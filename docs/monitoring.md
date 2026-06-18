# Monitoring i audyt

Panel diagnostyczny jest narzędziem administratora aplikacji. Nie należy go mylić z dashboardem użytkownika `/savings`, który pokazuje wykonane cykle i oszczędności.

Pełne porównanie obu widoków znajduje się w:

```text
docs/dashboards.md
```

## Aktywacja

1. Uruchom w Neon migrację:

```text
migrations/20260618_app_events.sql
```

2. Dodaj w Vercel zmienną środowiskową z Clerk User ID administratora:

```text
ADMIN_USER_IDS=user_xxx
```

Dla kilku administratorów użyj listy rozdzielonej przecinkami:

```text
ADMIN_USER_IDS=user_xxx,user_yyy
```

3. Wykonaj redeploy produkcji.

4. Otwórz:

```text
/admin/diagnostics
```

## Cel panelu

Panel ma służyć do wykrywania problemów operacyjnych, zanim zgłosi je użytkownik. Pokazuje zdarzenia systemowe, błędy, ostrzeżenia, źródła problemów oraz niespójności subskrypcji PRO.

Nie pokazuje efektów finansowych urządzeń użytkownika. Te dane należą do `/savings`.

## Rejestrowane zdarzenia

Pierwsza wersja zapisuje:

- poprawne i błędne importy CSV,
- wywołania API harmonogramu urządzeń,
- pobieranie danych PSE przez endpoint planera,
- start, stop i finalizację cykli raportowania oszczędności,
- czas odpowiedzi, status HTTP, źródło i typ zdarzenia,
- niespójności subskrypcji wyliczane na żywo w panelu.

## Interpretacja poziomów

- `info` — normalne zdarzenie operacyjne,
- `warning` — brak danych, odrzucone żądanie lub problem wymagający uwagi,
- `error` — nieudane wykonanie funkcji,
- `critical` — problem wymagający pilnej kontroli.

## Bezpieczeństwo

Logger usuwa z metadanych wartości pól zawierających m.in.:

```text
authorization
token
secret
password
api_key
signature
cookie
```

Treść plików CSV i pełne nagłówki żądań nie są zapisywane.

## Dalsze kroki

- oznaczanie błędów jako rozwiązane,
- okresowe usuwanie starych zdarzeń,
- alerty e-mail dla zdarzeń krytycznych,
- filtrowanie panelu po źródle, użytkowniku i poziomie,
- audyt webhooków Stripe we wszystkich ścieżkach płatności.
