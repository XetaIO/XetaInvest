use std::collections::{HashMap, HashSet};

use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::dtos::watchlists::ReorderWatchlistSection;
use crate::models::_entities::watchlists::Entity;
use crate::models::_entities::{watchlist_items, watchlist_sections};
use crate::validation::rules::{field_error, from_txn};

pub struct ReorderWatchlistAction;

impl ReorderWatchlistAction {
    /// Replaces the order of the sections and items of an owned watchlist.
    ///
    /// The layout must list every section and every item of the watchlist
    /// exactly once; items may move between sections.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        id: i64,
        layout: Vec<ReorderWatchlistSection>,
    ) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let watchlist = Entity::ensure_watchlist_owner(txn, user_id, id).await?;
                    let mut sections: HashMap<i64, watchlist_sections::Model> =
                        watchlist_sections::Entity::list_for_watchlist(txn, watchlist.id)
                            .await?
                            .into_iter()
                            .map(|row| (row.id, row))
                            .collect();
                    let mut items: HashMap<i64, watchlist_items::Model> =
                        watchlist_items::Entity::list_for_watchlist(txn, watchlist.id)
                            .await?
                            .into_iter()
                            .map(|row| (row.id, row))
                            .collect();

                    ensure_complete_layout(&layout, &sections, &items)?;

                    for (section_position, entry) in (0_i64..).zip(&layout) {
                        let section = sections.remove(&entry.id).ok_or_else(invalid_layout)?;
                        let mut section_am = section.into_active_model();
                        section_am.position = Set(section_position);
                        section_am.update(txn).await?;

                        for (item_position, item_id) in (0_i64..).zip(&entry.item_ids) {
                            let item = items.remove(item_id).ok_or_else(invalid_layout)?;
                            let mut item_am = item.into_active_model();
                            item_am.watchlist_section_id = Set(entry.id);
                            item_am.position = Set(item_position);
                            item_am.update(txn).await?;
                        }
                    }
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}

/// The layout must be a permutation of the existing sections and items.
fn ensure_complete_layout<S, I>(
    layout: &[ReorderWatchlistSection],
    sections: &HashMap<i64, S>,
    items: &HashMap<i64, I>,
) -> Result<()> {
    let section_ids: Vec<i64> = layout.iter().map(|entry| entry.id).collect();
    let item_ids: Vec<i64> = layout
        .iter()
        .flat_map(|entry| entry.item_ids.iter().copied())
        .collect();

    if is_permutation_of(&section_ids, sections) && is_permutation_of(&item_ids, items) {
        Ok(())
    } else {
        Err(invalid_layout())
    }
}

fn is_permutation_of<V>(ids: &[i64], existing: &HashMap<i64, V>) -> bool {
    let unique: HashSet<i64> = ids.iter().copied().collect();
    unique.len() == ids.len()
        && ids.len() == existing.len()
        && ids.iter().all(|id| existing.contains_key(id))
}

fn invalid_layout() -> Error {
    field_error("sections", "invalid", "The watchlist layout is invalid.")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn existing(ids: &[i64]) -> HashMap<i64, i64> {
        ids.iter().map(|id| (*id, *id)).collect()
    }

    #[test]
    fn permutation_requires_same_ids_exactly_once() {
        let known = existing(&[1, 2, 3]);
        assert!(is_permutation_of(&[3, 1, 2], &known));
        assert!(!is_permutation_of(&[1, 2], &known));
        assert!(!is_permutation_of(&[1, 2, 2], &known));
        assert!(!is_permutation_of(&[1, 2, 4], &known));
        assert!(!is_permutation_of(&[1, 2, 3, 3], &known));
    }
}
