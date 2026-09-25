//! Read model behind `GET /api/watchlists`: every list with its sections and
//! items, plus the user's open position (average cost) on each listed ticker.

use std::collections::{HashMap, HashSet};

use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::dtos::watchlists::{
    WatchlistDto, WatchlistInstrumentDto, WatchlistItemDto, WatchlistLimitsDto,
    WatchlistPageResponse, WatchlistPositionDto, WatchlistSectionDto,
};
use crate::models::_entities::{
    instruments, portfolios, positions, transactions, watchlist_items, watchlist_sections,
    watchlists,
};
use crate::models::watchlists::{MAX_ITEMS, MAX_PER_USER};
use crate::services::portfolio_calculator::Holding;

/// Builds the watchlist page payload.
///
/// `active_id` selects the active list when it is owned; otherwise the first
/// list is active.
pub async fn build(
    ctx: &AppContext,
    user_id: i64,
    active_id: Option<i64>,
) -> Result<WatchlistPageResponse> {
    let lists = watchlists::Entity::list_for_user(&ctx.db, user_id).await?;
    let list_ids: Vec<i64> = lists.iter().map(|row| row.id).collect();

    let mut sections_by_list: HashMap<i64, Vec<watchlist_sections::Model>> = HashMap::new();
    for section in watchlist_sections::Entity::list_for_watchlists(&ctx.db, &list_ids).await? {
        sections_by_list
            .entry(section.watchlist_id)
            .or_default()
            .push(section);
    }

    let items = watchlist_items::Entity::list_for_watchlists(&ctx.db, &list_ids).await?;
    let instrument_ids: Vec<i64> = items.iter().map(|item| item.instrument_id).collect();
    let instruments: HashMap<i64, instruments::Model> =
        instruments::Entity::find_by_ids(&ctx.db, &instrument_ids)
            .await?
            .into_iter()
            .map(|row| (row.id, row))
            .collect();
    let mut items_by_section: HashMap<i64, Vec<WatchlistItemDto>> = HashMap::new();
    for item in items {
        let Some(instrument) = instruments.get(&item.instrument_id) else {
            continue;
        };
        items_by_section
            .entry(item.watchlist_section_id)
            .or_default()
            .push(item_dto(&item, instrument));
    }

    let watchlists: Vec<WatchlistDto> = lists
        .into_iter()
        .map(|list| WatchlistDto {
            id: list.id,
            sections: sections_by_list
                .remove(&list.id)
                .unwrap_or_default()
                .into_iter()
                .map(|section| WatchlistSectionDto {
                    id: section.id,
                    items: items_by_section.remove(&section.id).unwrap_or_default(),
                    name: section.name,
                    position: section.position,
                    is_default: section.is_default,
                })
                .collect(),
            name: list.name,
            position: list.position,
        })
        .collect();

    let active_watchlist_id = active_id
        .filter(|id| watchlists.iter().any(|row| row.id == *id))
        .or_else(|| watchlists.first().map(|row| row.id));

    let symbols: HashSet<String> = instruments
        .values()
        .map(|row| row.symbol.to_ascii_uppercase())
        .collect();

    Ok(WatchlistPageResponse {
        watchlists,
        active_watchlist_id,
        positions: positions_by_symbol(ctx, user_id, &symbols).await?,
        limits: WatchlistLimitsDto {
            max_per_user: MAX_PER_USER,
            max_items: MAX_ITEMS,
        },
    })
}

fn item_dto(item: &watchlist_items::Model, instrument: &instruments::Model) -> WatchlistItemDto {
    WatchlistItemDto {
        id: item.id,
        section_id: item.watchlist_section_id,
        position: item.position,
        instrument: WatchlistInstrumentDto {
            id: instrument.id,
            symbol: instrument.symbol.clone(),
            name: instrument.name.clone(),
            exchange: instrument.exchange.clone(),
            quote_type: instrument.quote_type.clone(),
            currency: instrument.currency.clone(),
            logo_url: None,
        },
    }
}

/// Open quantity and average cost of `symbols` across all the user's portfolios.
async fn positions_by_symbol(
    ctx: &AppContext,
    user_id: i64,
    symbols: &HashSet<String>,
) -> Result<HashMap<String, WatchlistPositionDto>> {
    let mut aggregate: HashMap<String, (Decimal, Decimal, String)> = HashMap::new();
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    let portfolio_ids: Vec<i64> = portfolios::Entity::list_for_user(&ctx.db, user_id)
        .await?
        .iter()
        .map(|row| row.id)
        .collect();
    let position_rows = positions::Entity::list_for_portfolios(&ctx.db, &portfolio_ids).await?;
    let instrument_ids: Vec<i64> = position_rows.iter().map(|row| row.instrument_id).collect();
    let instruments: HashMap<i64, instruments::Model> =
        instruments::Entity::find_by_ids(&ctx.db, &instrument_ids)
            .await?
            .into_iter()
            .map(|row| (row.id, row))
            .collect();
    let position_ids: Vec<i64> = position_rows.iter().map(|row| row.id).collect();
    let lots = transactions::Entity::lots_by_position(&ctx.db, &position_ids).await?;

    for position in &position_rows {
        let Some(instrument) = instruments.get(&position.instrument_id) else {
            continue;
        };
        let symbol = instrument.symbol.to_ascii_uppercase();
        if !symbols.contains(&symbol) {
            continue;
        }
        let holding = Holding::from_lots(lots.get(&position.id).map_or(&[], Vec::as_slice));
        let quantity = holding.quantity();
        if quantity <= Decimal::ZERO {
            continue;
        }
        let entry = aggregate
            .entry(symbol)
            .or_insert_with(|| (Decimal::ZERO, Decimal::ZERO, instrument.native_currency()));
        entry.0 += quantity;
        entry.1 += holding.invested();
    }

    Ok(aggregate
        .into_iter()
        .map(|(symbol, (quantity, invested, currency))| {
            let position = WatchlistPositionDto {
                avg_price: invested / quantity,
                quantity,
                currency: Some(currency),
            };
            (symbol, position)
        })
        .collect())
}
