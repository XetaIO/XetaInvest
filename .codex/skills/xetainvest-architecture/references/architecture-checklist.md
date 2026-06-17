# Architecture Checklist

## Backend

- Laravel 13, PHP 8.3+, Inertia 3, PostgreSQL 16+.
- Controllers only coordinate requests, Actions/Services, responses, and flashes.
- Use one Form Request per write operation (including delete); authorize through model policies.
- Assemble Inertia page props with `Build*PageData` services that return arrays.
- Reuse `PortfolioSelector`, `PortfolioMarketDataFetcher`, and `AiReport::scopeTodayFor()` where applicable.
- Put reusable domain calculations and external integrations in Services.
- Put single-purpose mutations in `app/Actions/{Domain}` with PHPDoc array shapes on `$data`.
- Use typed model relationships and `casts()` methods.
- Enforce critical invariants in both application code and the database.
- Serialize quota, limit, default-selection, and ordered-list writes with transactions and locks.
- Resolve AI drivers through the container (`AiManager` + `OpenAiProvider` binding).

## AI

- Only provider classes perform external AI HTTP calls.
- Reserve daily user and global quota before every provider request.
- Release reservations after provider failure and reconcile them with actual usage after success.
- Never expose provider exceptions, prompts, credentials, or internal stack details to users.
- Follow the user's locale for reports and chat responses.

## Frontend

- React 19, strict TypeScript, Vite 8, Tailwind 4, Inertia pages.
- Use named component exports; default exports are reserved for Inertia pages.
- Keep business behavior in hooks or library functions.
- Import from direct source modules through the `@/` alias.
- Use `useTranslation()` and `i18n.resolvedLanguage`.
- Add translation keys to both `resources/js/locales/fr.json` and `en.json`.
- Lazy-load expensive global widgets and secondary workflows.

## Tests And CI

- Cover happy path, authorization, validation, and edge cases.
- Add focused tests under `tests/Unit/` for pure service logic (calculators, validators, parsers).
- Run feature tests against PostgreSQL in CI.
- Run Pint, Prettier, ESLint, TypeScript, Vitest, production build, Composer audit, and npm audit.
- CI checks formatting without rewriting repository files.
