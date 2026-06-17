# XetaInvest — Copilot Instructions

> **Last updated**: June 2026

## Project Overview

XetaInvest is a **personal investment portfolio management** application with AI features (reports, chat, screener). Built with **Laravel 13 + Inertia.js v3 + React 19 + TypeScript**.

---

## Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| PHP | ^8.3 | Language |
| Laravel | ^13 | Framework |
| Inertia.js | ^3.0 | SSR/SPA bridge |
| Laravel Fortify | ^1 | Auth (headless) |
| Laravel Wayfinder | ^0.1 | Type-safe routes for React |
| Pest | ^4 | Testing framework |
| Laravel Pint | ^1 | PHP code formatter |
| PostgreSQL | 16+ | Database |

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | ^19 | UI |
| TypeScript | ^5.7 | Type safety |
| Vite | ^8 | Build tool |
| Tailwind CSS | ^4 | Styling |
| Radix UI / shadcn-ui | - | Headless components |
| Recharts | ^3 | Charts |
| i18next + react-i18next | ^26/^17 | i18n (FR/EN) |
| Sonner | ^2 | Toast notifications |
| react-markdown + remark-gfm | - | Markdown rendering |
| Lucide React | ^0.475 | Icons |
| class-variance-authority | ^0.7 | CSS variants |

---

## Namespace & Structure

The PHP namespace is `App\` (standard Laravel). All logic lives in `app/`.

```
app/
├── Actions/{Domain}/          # Single-purpose action classes (Create*, Update*, Delete*)
├── Concerns/                  # Shared traits
├── Enums/{Domain}/            # Backed PHP enums with label()
├── Http/
│   ├── Controllers/           # Minimal controllers — delegate to Actions or Build*PageData
│   ├── Controllers/Api/       # JSON API endpoints
│   ├── Requests/{Domain}/     # Form Requests (validation + authorize via Policy)
│   └── Middleware/            # SetLocale, etc.
├── Models/                    # Eloquent models (scopes such as AiReport::todayFor)
├── Policies/                  # Authorization (one Policy per model)
└── Services/                  # Business logic, calculators, external API clients
    ├── Build*PageData.php     # Inertia page payload builders (return array)
    ├── PortfolioSelector.php  # Portfolio list + scope resolution
    ├── PortfolioMarketDataFetcher.php
    └── Ai/                    # AI layer: Providers, Chat, Reports, Tools
```

```
resources/js/
├── actions/                   # TypeScript helpers (non-UI logic)
├── components/
│   ├── ui/                    # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── ai/                    # AI components (chat, reports)
│   ├── budget/                # Budget components
│   ├── charts/                # Reusable Recharts components
│   ├── portfolio/             # Portfolio components
│   └── watchlist/             # Watchlist components
├── hooks/                     # Custom React hooks
├── layouts/                   # Inertia layouts
├── lib/
│   └── i18n.ts                # i18next config
├── locales/
│   ├── fr.json                # French translations (default language)
│   └── en.json                # English translations
├── pages/                     # Inertia pages (one per route)
├── routes/                    # Wayfinder generated routes
└── types/                     # TypeScript interfaces
```

---

## Development Principles

### SOLID

- **S** — One class = one responsibility. Controllers delegate to Actions or Services. No business logic in controllers.
- **O** — Extend via composition/interface, not modification. See `AiProvider` (contract) + `OpenAiProvider` (implementation).
- **L** — Every contract implementation must be substitutable without altering expected behavior.
- **I** — Thin contracts (e.g. `AiProvider` only exposes `chat()` and `name()`).
- **D** — Inject dependencies via the constructor. Never `new` a service inside a controller.

### KISS & YAGNI

- Do not create abstractions for a single use case.
- Do not anticipate features that have not been requested.
- Favor readability over premature elegance.

### DRY

- Share logic via traits (`Concerns/`), reusable Actions, and React components.
- Do not duplicate validation logic between a Form Request and its controller.

---

## PHP / Laravel Conventions

### General
- `declare(strict_types=1)` at the top of every PHP file.
- Always use curly braces for control structures, even single-line ones.
- Always declare explicit return types on all methods.
- Use PHPDoc array shapes (`@param array{key: Type} $data`) for complex arrays.
- Enum keys in TitleCase: `BuyAction`, `Monthly`.

### Controllers
```php
// ✅ Minimal — delegates to an Action via DI
public function store(StorePortfolioRequest $request, CreatePortfolio $action): RedirectResponse
{
    $action->handle($request->user(), $request->validated());
    return back();
}
```

### Page data builders (`Build*PageData`)

Read routes assemble Inertia props through dedicated builders in `app/Services/`:

| Builder | Page |
|---|---|
| `BuildDashboardPageData` | dashboard |
| `BuildStatisticsPageData` | statistics |
| `BuildWatchlistPageData` | watchlist |
| `BuildSymbolPageData` | symbol |

Builders return plain arrays; controllers call `Inertia::render()`. Shared helpers:

- `PortfolioSelector` — portfolio list + scope resolution (dashboard vs statistics)
- `PortfolioMarketDataFetcher` — quotes + FX for loaded portfolios
- `AiReport::scopeTodayFor()` — today's AI report by type/scope

```php
// ✅ Thin controller + array builder
public function index(Request $request, BuildWatchlistPageData $builder): Response
{
    return Inertia::render(
        'watchlist',
        $builder->build($request->user(), (string) $request->query('watchlist', '')),
    );
}
```

### Form Requests
- One Form Request per action (separate Store/Update).
- `authorize()` delegates to the Policy via `$this->user()->can(...)`.
- Custom error messages in `messages()`.

### Models
- Typed relationships: `public function user(): BelongsTo`.
- Typed scopes: `public function scopeActive(Builder $query): Builder`.
- Casts in the `casts()` method, not the `$casts` property.
- Limit constants on the model: `Portfolio::MAX_PER_USER`.

### Actions
```php
// Action pattern: single-purpose class with typed array shapes
class CreatePortfolio
{
    /** @param array{name: string, is_default?: bool} $data */
    public function handle(User $user, array $data): Portfolio
    {
        // ...
    }
}
```

### AI Services
- The `Services/Ai/Providers/` layer is the only place that calls the OpenAI API.
- Newer models (o1, o3, o4, gpt-5.x) require `max_completion_tokens`; legacy models (gpt-3.x, gpt-4.x) use `max_tokens`. Detection is handled in `OpenAiProvider::supportsMaxTokens()`.
- `BaseReportGenerator::parseContent()` handles: unwrapping when the model collapses the response into a single `narrative_md` JSON string, and trimming incomplete last sentences when the response is cut off by `max_tokens`.

### Database
- PostgreSQL only.
- Partial unique indexes: use `DB::statement()` for PostgreSQL-specific SQL.
- `DB::transaction()` for multi-step operations.
- No raw `DB::` for simple queries — prefer Eloquent.

### Formatting
- Always run `vendor/bin/pint --dirty` before finalizing any modified PHP files.

---

## Internationalization (i18n)

- Default language: **FR**. Secondary language: **EN**.
- The `SetLocale` middleware resolves the locale from: (1) the authenticated user's `locale` column, (2) the `locale` cookie, (3) the default `'fr'`.
- **Frontend**: `i18next` configured in `resources/js/lib/i18n.ts`. Always use `const { t, i18n } = useTranslation()` (the hook, not the imported singleton). Use `i18n.resolvedLanguage` to compare the active language (handles regional codes like `en-US`).
- **Backend**: translations in `lang/fr/` and `lang/en/`. Laravel applies them automatically via `App::setLocale()`.
- Every new visible string must have a key in both `fr.json` **and** `en.json`.

---

## Testing (Pest 4)

### Golden rule
**Every new feature must be covered by a test.** Every change must update existing tests.

### Structure
```
tests/
├── Feature/           # HTTP / integration tests (controllers, policies, middleware)
├── Unit/              # Unit tests (services, calculators, parsers)
├── Pest.php           # Global config + helpers
└── TestCase.php
```

### Conventions
- `RefreshDatabase` enabled for all Feature tests (configured in `Pest.php`).
- `beforeEach()` for fixture setup.
- Naming: short phrase describing the behavior (`'user can create a portfolio'`, `'duplicate name within same user is rejected'`).
- Group with `describe()` for resources with multiple scenarios.
- Use `expect()->chain()` for readable assertions.

### Full Feature test example
```php
<?php

declare(strict_types=1);

use App\Models\Portfolio;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

describe('portfolio creation', function () {
    test('user can create a portfolio', function () {
        $this->actingAs($this->user)
            ->post(route('portfolios.store'), ['name' => 'Long term'])
            ->assertRedirect();

        expect($this->user->portfolios()->count())->toBe(1);
    });

    test('user cannot exceed the portfolio limit', function () {
        Portfolio::factory()->count(Portfolio::MAX_PER_USER)->forUser($this->user)->create();

        $this->actingAs($this->user)
            ->post(route('portfolios.store'), ['name' => 'Overflow'])
            ->assertForbidden();
    });

    test('guest cannot create a portfolio', function () {
        $this->post(route('portfolios.store'), ['name' => 'Test'])
            ->assertRedirect(route('login'));
    });

    test('duplicate name within same user is rejected', function () {
        Portfolio::factory()->forUser($this->user)->create(['name' => 'Same']);

        $this->actingAs($this->user)
            ->post(route('portfolios.store'), ['name' => 'Same'])
            ->assertSessionHasErrors('name');
    });
});
```

### Expected coverage per feature
For every controller / service, test at minimum:
1. **Happy path** — expected behavior with valid data
2. **Authorization** — guest redirected, non-owner → 403
3. **Validation** — invalid data → `assertSessionHasErrors` or `assertUnprocessable`
4. **Edge cases** — quotas, duplicates, forbidden states

### Commands
```bash
php artisan test                                               # All tests
php artisan test tests/Feature/PortfolioControllerTest.php    # Specific file
php artisan test --filter="user can create"                   # Filter by name
```

---

## Frontend Conventions (React + TypeScript)

### Components
- **Named exports** (no `export default`) except for Inertia pages.
- Props typed with a local `interface`.
- No business logic in components — delegate to hooks.
- Use `cn()` (from `lib/utils.ts`) for conditional class names.

```tsx
// ✅
interface PortfolioCardProps {
    portfolio: Portfolio;
    onDelete: () => void;
}

export function PortfolioCard({ portfolio, onDelete }: PortfolioCardProps) {
    // ...
}

// ❌ default export without interface
export default function({ portfolio, onDelete }) { ... }
```

### Hooks
- One hook = one responsibility (`useAiChat`, `usePortfolioStats`).
- `use` prefix required.
- Return a named object, not an array (except React conventions like `useState`).

### Imports
- `@/` alias for absolute imports from `resources/js/`.
- Import directly from the source file, not from a barrel `index.ts`.

```tsx
// ✅
import { PortfolioCard } from '@/components/portfolio/portfolio-card';

// ❌
import { PortfolioCard } from '@/components/portfolio';
```

### Routes (Wayfinder)
```tsx
import { index as portfolioIndex } from '@/routes/portfolios';
import { useForm } from '@inertiajs/react';

const { post } = useForm({ name: '' });
post(portfolioIndex().url);
```

### i18n (Frontend)
```tsx
// ✅ Always use the hook
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t, i18n } = useTranslation();

    // resolvedLanguage, not language — handles regional codes like 'en-US'
    const isFrench = i18n.resolvedLanguage === 'fr';

    return <span>{t('portfolio.create')}</span>;
}
```

### Toasts
Use `sonner`:
```tsx
import { toast } from 'sonner';

toast.success(t('portfolio.created'));
toast.error(t('common.error'));
```

### Charts (Recharts)
- Components in `components/charts/`.
- Always wrap with `ResponsiveContainer`.
- Colors from Tailwind CSS variables.

### Strict typing
- No `any`. Use `unknown` when the type is truly unknown, then narrow it.
- Data types from Laravel are defined in `resources/js/types/`.
- Always run `npm run types:check` before finalizing.

### Code quality
```bash
npm run lint         # ESLint (with auto-fix)
npm run format       # Prettier
npm run types:check  # TypeScript strict check
```

---

## Domain Model

| Model | Role |
|---|---|
| `User` | Authenticated user |
| `Portfolio` | Investment portfolio (max `Portfolio::MAX_PER_USER` per user) |
| `Position` | Open position on an instrument within a portfolio |
| `Transaction` | Buy/sell linked to a position |
| `Instrument` | Financial instrument (stocks, ETFs, crypto…) |
| `Watchlist` / `WatchlistItem` | Watch list |
| `Budget` / `BudgetGroup` / `BudgetLine` | Budget management (income / expenses) |
| `AiReport` | AI-generated report (stored in DB, status: pending/success/failed) |
| `AiChatSession` / `AiChatMessage` | AI chat sessions |
| `AiUsage` | AI consumption tracking (daily quota) |
| `PortfolioSnapshot` | Valuation snapshot for history |

---

## Security (OWASP)

- Always validate via Form Request — never inline in the controller.
- `authorize()` in every Form Request — never bypass it.
- Access policies (`Policies/`) checked via `$this->user()->can()`.
- No `env()` outside `config/` files. Always use `config('ai.models.chat')`.
- AI quota checked via `AiUsageLogger::ensureWithinQuota()` before every AI call.

---

## Useful Commands

```bash
# Backend
composer run dev                    # Server + queue + Vite
php artisan test                    # All tests
php artisan test --filter=Foo       # Filtered tests
vendor/bin/pint --dirty             # Format modified files
php artisan route:list              # List routes

# Frontend
npm run dev                         # Dev server
npm run build                       # Production build
npm run lint                        # ESLint
npm run format                      # Prettier
npm run types:check                 # TypeScript check
```
