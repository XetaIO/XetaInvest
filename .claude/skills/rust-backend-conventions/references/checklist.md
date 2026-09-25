# Backend pre-commit checklist

## Layering
- [ ] New logic sits in the right layer: controller (thin) / action (one
      write op, one `run`) / model (`impl Entity` query helpers) / dto
      (narrow, purpose-specific) / service (cross-entity aggregation only)
- [ ] No hand-edits inside `src/models/_entities/`

## SOLID
- [ ] One Action struct per write operation, one `run` method
- [ ] New behavior added via new Actions/query methods, not branches in
      existing ones
- [ ] DTOs stay narrow — no god-DTO reused across create/update/read
- [ ] New query helpers on `Entity` take `<C: ConnectionTrait>`, not a
      concrete `&DatabaseConnection`

## Clean code
- [ ] Action struct names follow `Verb + Resource + Action`
- [ ] Multi-step writes wrapped in `ctx.db.transaction::<_, Model,
      Error>(...)`, errors mapped with `from_txn`
- [ ] No `.unwrap()` / `.expect()` outside `#[cfg(test)]`
- [ ] No new `#[allow(clippy::...)]` beyond the crate-level exceptions
- [ ] Validation reuses `src/validation/rules.rs` helpers or
      `#[validate(...)]` on the DTO, not ad hoc checks

## Documentation
- [ ] Module-level `//!` doc on new controller/service files (route
      prefix + invariants)
- [ ] `///` doc on new public fns/structs, noting side effects/invariants
- [ ] No `# Errors` sections added (crate allows `missing_errors_doc`)

## Tests
- [ ] New test file placed under `tests/requests|models|services|tasks/`
      matching what it exercises
- [ ] Auth guard test (401 unauthenticated)
- [ ] Ownership test — spoofed body owner field is ignored/rejected
- [ ] Cross-user access returns 404, not 403
- [ ] Validation errors asserted via `assert_field_error`
- [ ] Any uniqueness/exclusivity constraint has its own test
- [ ] Any per-user limit constant has its own test
- [ ] `cargo clippy --all-targets` and `cargo test` both pass
