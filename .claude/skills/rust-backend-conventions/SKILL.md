---
name: rust-backend-conventions
description: Apply this repo's SOLID, clean-code, doc-comment, and testing conventions when adding or modifying Rust backend code — controllers, actions, models, DTOs, services, validation, or migrations in src/ or tests/. Use before writing new endpoints/actions or refactoring existing ones.
---

# Rust backend conventions (xeta_invest)

For "where files live" and generator commands, see `AGENTS.md` at the repo
root. This skill covers the SOLID/clean-code/testing discipline this repo
already applies — follow the patterns below rather than inventing new ones.

See `references/checklist.md` for a condensed pre-commit checklist.

## Layering

```
controller (src/controllers/<resource>.rs)
  -> action (src/actions/<resource>/<verb>_<resource>.rs)
    -> model/entity (src/models/<entity>.rs; generated parts in
       src/models/_entities/ are never hand-edited)
      -> dto (src/dtos/<resource>.rs)
```

`src/services/*.rs` holds cross-entity read-model/aggregation logic that
doesn't belong to a single action (e.g. `dashboard.rs`,
`portfolio_calculator.rs`, `watchlist_page.rs`).

## SOLID, mapped onto this codebase

Don't introduce a repository-trait/DI abstraction — this codebase's seam
is the Sea-ORM `ConnectionTrait` generic. Apply SOLID through the patterns
already in place:

- **SRP** — one Action struct per write operation, with a single `run`:
  ```rust
  pub struct CreatePortfolioAction;
  impl CreatePortfolioAction {
      pub async fn run(ctx: &AppContext, user_id: i64, params: CreatePortfolio) -> Result<Model> { ... }
  }
  ```
  One controller function per HTTP verb; one DTO per request/response shape.

- **OCP/LSP** — extend by adding new Action structs or new `impl Entity`
  query methods, never by branching inside existing ones. Sea-ORM's
  `impl ActiveModelBehavior for ActiveModel` (e.g. the `before_save` hook
  that stamps `updated_at`) is the substitutable-behavior seam — don't
  special-case entities inside shared code.

- **ISP** — keep DTOs narrow and purpose-specific. `CreatePortfolio`,
  `UpdatePortfolio`, and `PortfolioDto` are separate types in
  `src/dtos/portfolios.rs`, each carrying only the fields its one caller
  needs — don't reuse one god-DTO across create/update/read.

- **DIP** — the dependency-inversion seam here is the generic connection
  parameter, not a trait object:
  ```rust
  impl Entity {
      pub async fn list_for_user<C: ConnectionTrait>(db: &C, user_id: i64) -> Result<Vec<Model>, DbErr> { ... }
  }
  ```
  This lets the same query run against `&ctx.db` directly or inside a
  transaction closure. New query helpers on `Entity` should take
  `&C: ConnectionTrait` generically, not a concrete `&DatabaseConnection`.

## Clean code

- Naming: `Verb + Resource + Action` for action structs
  (`CreatePortfolioAction`, `SetDefaultPortfolioAction`); `snake_case` fns;
  DTO names mirror the exported TS type (`CreatePortfolio`, `PortfolioDto`).
- Multi-step writes go inside a transaction:
  ```rust
  ctx.db
      .transaction::<_, Model, Error>(|txn| Box::pin(async move { ... }))
      .await
      .map_err(from_txn)
  ```
  Use the shared `from_txn` / `field_error` helpers from
  `src/validation/rules.rs` to surface validation-shaped 400s from inside
  a transaction closure.
- Functions return `loco_rs::Result<T>` and propagate with `?`. No
  `.unwrap()` / `.expect()` outside `#[cfg(test)]` code.
- `clippy::pedantic` is warn-level project-wide. Write code that doesn't
  need a new `#[allow]` — only `module_name_repetitions` and
  `missing_errors_doc` are pre-allowed at the crate level.
  `unsafe_code` is forbidden outright.
- Reuse shared validators in `src/validation/rules.rs` (e.g.
  `positive_amount`, `iso_date_not_future`) plus `#[validate(...)]`
  attributes on DTOs instead of hand-rolling ad hoc validation inside
  actions or controllers.

## Doc comments

Module-level `//!` at the top of controller/service files, stating the
route prefix and any cross-cutting invariant:

```rust
//! `/api/portfolios`: CRUD on the signed-in user's portfolios.
//!
//! Portfolios of other users behave as if they did not exist (404).
```

`///` on public functions/structs, imperative/descriptive present tense,
calling out side effects and invariants when non-obvious:

```rust
/// Loads a portfolio only if it belongs to `user_id`.
///
/// Returns the row, or `None` (unknown or someone else's).
pub async fn find_owned<C>(...) -> Result<Option<Model>, DbErr>
```

`missing_errors_doc = "allow"` means `# Errors` sections are not required
— don't add them.

## Tests

Tests are organized **by kind**, not by feature:
`tests/requests/` (HTTP-level, full stack), `tests/models/` (entity/query
helpers), `tests/services/`, `tests/tasks/`. Match this layout for new
tests.

Standard pattern:

```rust
#[tokio::test]
#[serial]
async fn it_does_x() {
    let ctx = boot_test::<App>().await.unwrap();
    seed::<App>(&ctx.db).await.unwrap(); // model/service tests needing fixtures
    ...
}
```

- `tests/fixtures/mod.rs` provides Rust row-builder helpers — distinct
  from the Loco DB seed data in `src/fixtures/*.yaml`.
- Request tests use
  `request::<App, _, _>(|request, ctx| async move { ... }).await`.
- Use `rstest` for parameterized unit tests (see the `#[rstest]
  #[case(...)]` blocks in `src/validation/rules.rs`'s `#[cfg(test)] mod
  tests`).
- Use `insta` + a `snapshots/` dir where output shape matters more than
  exact values.
- `tests/requests/mod.rs` exposes a shared `assert_field_error(text,
  field)` helper for Loco's 400 validation payload shape — use it instead
  of hand-parsing the error body.

Expected coverage for a new resource endpoint (generalized from
`tests/requests/portfolios.rs`'s 7 tests):

- auth guard (401 when unauthenticated)
- ownership comes from the JWT/session, never the body — a spoofed owner
  field in the request must be ignored or rejected
- cross-user access returns 404, not 403 (the resource "behaves as if it
  did not exist")
- validation errors go through `assert_field_error`
- any uniqueness/exclusivity constraint (e.g. "exclusive default") gets
  its own test
- any per-user limit constant (e.g. `MAX_PER_USER` in
  `src/models/portfolios.rs`) gets its own test

## Before finishing

```
cargo clippy --all-targets
cargo test
```
