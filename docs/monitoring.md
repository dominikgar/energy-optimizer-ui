# Monitoring i audyt

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

## Rejestrowane zdarzenia

Pierwsza wersja zapisuje:

- poprawne i błędne importy CSV,
- wywołania API harmonogramu urządzeń,
- pobieranie danych PSE przez endpoint planera,
- czas odpowiedzi, status HTTP, źródło i typ zdarzenia,
- niespójności subskrypcji wyliczane na żywo w panelu.

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
- audyt webhooków Stripe,
- statystyki osiągniętych oszczędności.
