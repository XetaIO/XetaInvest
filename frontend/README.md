# Xeta Invest frontend

React + TypeScript + Vite, with React Router, TanStack Query and React Toastify.

## Development

The repository includes a `package-lock.json`. From `frontend/`:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Vite serves the application on port 5173 and proxies `/api` to the Rust server
on port 5150. Start the backend from the project root with `cargo loco start`.
The production build is written to `frontend/dist` for Loco to serve.
The existing pnpm scripts remain usable; the commands above use the committed
npm lockfile. `npm run test:watch` runs tests while developing.

## Architecture

```text
src/
  main.tsx                       React entry point, global styles and i18n
  app/
    App.tsx                      Providers and application composition
    AppRoutes.tsx                Single browser router
    queryClient.ts               Query cache and API session-expiration handling
    routes/                      Public, guest and protected route definitions
    i18n/                        Translation initialization
    styles/
  features/
    Auth/
      api/                       Session query and login/logout HTTP calls
      hooks/useAuth.ts           Authentication API for components
      providers/                 AuthProvider and its context
      components/                RequireAuth, RequireGuest and session status UI
      views/                     Login page
    Dashboard/views/
    Pages/views/                 Public home and 404
  shared/
    api/client.ts                Typed HTTP client; cookie credentials and cancellation
    providers/                   ThemeProvider and its context
    hooks/useTheme.ts
    components/
      common/                    ThemeSelect and ThemedToastContainer
      layouts/                   PublicLayout, AuthLayout and AppLayout
    utils/                       Safe local redirects
  bindings/                      Generated Rust API types
  test/                          Test environment setup
```

`App` composes `QueryClientProvider → ThemeProvider → AuthProvider`, with
`AppRoutes` and a single `ThemedToastContainer` beneath them. Authentication
actions do not navigate: route guards and views handle navigation.

## Routes and layouts

| URL          | Access              | Layout       |
| ------------ | ------------------- | ------------ |
| `/`          | Public              | PublicLayout |
| `/login`     | Guests              | AuthLayout   |
| `/dashboard` | Authenticated users | AppLayout    |
| Unknown URL  | Public 404          | PublicLayout |

Add a view under its feature and register it in `app/routes/index.tsx`.
The route groups apply their guard and layout automatically. Views use lazy
imports with a shared Suspense boundary. Rendering failures show a reload page.

## Authentication

`useAuth()` exposes `user`, `isAuthenticated`, `isLoading`, `error`,
`isLoggingIn`, `isLoggingOut`, `login()`, `logout()` and `refreshSession()`.

The `["auth", "me"]` TanStack Query entry is the only source of session data.
It reads `GET /api/auth/current`, treats 401 as an anonymous session, and keeps
network/server failures distinct so the user can retry.

Login posts to `/api/auth/login`, then fetches the current user before navigating.
The requested local path, query string and hash are preserved; external URLs
and redirects back to login are rejected. Logout posts to `/api/auth/logout`;
only a successful response or an already-expired session clears the client state.

The Rust backend owns the HttpOnly session cookie. The frontend sends same-origin
credentials and does not store authentication tokens in browser storage.
Private queries are cancelled and removed when the session ends or changes user.

Use TanStack Query queries/mutations with `shared/api/client.ts` for new API
features: the application's query/mutation caches handle 401 responses centrally.
Authentication mutations may opt out through `meta: { skipAuthReset: true }`
(e.g. invalid login credentials). Plain HTTP calls throw errors to their caller;
the shared client itself does not navigate.

## Theme and notifications

`useTheme()` exposes `theme`, `resolvedTheme` and `setTheme()`.
The preference is `light`, `dark` or `system`, persisted under
`xeta-invest-theme`. System mode follows changes to the OS preference.
The provider applies the root `dark` class and CSS `color-scheme`.

Use `toast.success(...)` or `toast.error(...)` from `react-toastify`.
The single container uses the resolved theme for new notifications and remains
mounted during navigation. Form validation errors stay beside the form.

## Verification

`npm run build` includes TypeScript checks for the application and tool configs.
Vitest + Testing Library exercise real providers and routes under StrictMode,
with mocked HTTP responses: login, protected routes, session expiration, logout
success/failure, cache cleanup, API retry, public pages, redirects and theme changes.
These tests do not replace an end-to-end check against a running Rust backend.
