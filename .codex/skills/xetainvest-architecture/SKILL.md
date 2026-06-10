---
name: xetainvest-architecture
description: Apply XetaInvest's Laravel, Inertia, React, TypeScript, PostgreSQL, AI quota, security, i18n, and testing conventions. Use when implementing, refactoring, reviewing, debugging, or testing code in the XetaInvest repository.
---

# XetaInvest Architecture

Apply the repository conventions before changing code.

## Workflow

1. Read `.github/copilot-instructions.md` and `references/architecture-checklist.md`.
2. Inspect neighboring code and reuse existing Actions, Services, Form Requests, hooks, components, and types.
3. Keep controllers minimal and move business logic into a single-purpose Action or Service.
4. Protect multi-step writes with transactions, database constraints, and parent-row locks when concurrent requests can race.
5. Add or update backend and frontend tests for the changed behavior.
6. Run the relevant validation commands before finishing.

## Required Checks

- Put `declare(strict_types=1);` in every PHP file.
- Validate HTTP input with an authorized Form Request.
- Use PostgreSQL-compatible migrations and partial indexes where nullable uniqueness is involved.
- Reserve AI quota before every provider call, including tool-loop iterations.
- Translate every visible string in both French and English.
- Import TypeScript types directly from their source module and never use `any`.
- Preserve unrelated working-tree changes.

## Validation

Run the narrow tests first, then:

```bash
vendor/bin/pint --dirty
php artisan test
npm run format:check
npm run lint:check
npm run types:check
npm run test:frontend
npm run build
npm audit --audit-level=high
composer audit --locked
```
