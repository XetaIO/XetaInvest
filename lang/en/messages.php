<?php

declare(strict_types=1);

return [
    // PortfolioController
    'portfolio.created' => 'Portfolio created.',
    'portfolio.updated' => 'Portfolio updated.',
    'portfolio.deleted' => 'Portfolio deleted.',
    'portfolio.limit_reached' => 'The maximum number of portfolios has been reached.',

    // PositionController
    'position.symbol_not_found' => 'Symbol not found.',
    'position.added' => 'Investment added.',
    'position.deleted' => 'Position deleted.',

    // WatchlistController
    'watchlist.created' => 'Watchlist created.',
    'watchlist.renamed' => 'Watchlist renamed.',
    'watchlist.deleted' => 'Watchlist deleted.',
    'watchlist.limit_reached' => 'The maximum number of watchlists has been reached.',
    'watchlist.invalid_order' => 'The ordered list must contain every tracked item exactly once.',
    'watchlist.invalid_layout' => 'The layout must contain every section and symbol exactly once.',
    'watchlist.default_section' => 'General',

    // WatchlistSectionController
    'watchlist_section.created' => 'Section created.',
    'watchlist_section.renamed' => 'Section renamed.',
    'watchlist_section.deleted' => 'Section deleted.',
    'watchlist_section.default_protected' => 'The default section cannot be deleted.',

    // TransactionController
    'transaction.added' => 'Transaction added.',
    'transaction.updated' => 'Transaction updated.',
    'transaction.deleted' => 'Transaction deleted.',
    'transaction.insufficient_quantity' => 'This operation would create a negative holding quantity on the selected date.',

    // WatchlistItemController
    'watchlist_item.symbol_not_found' => 'Symbol not found.',
    'watchlist_item.already_present' => 'Symbol already in watchlist.',
    'watchlist_item.moved' => 'Symbol moved.',
    'watchlist_item.added' => 'Symbol added.',
    'watchlist_item.removed' => 'Symbol removed.',

    // Settings
    'profile.updated' => 'Profile updated.',
    'password.updated' => 'Password updated.',
    'locale.updated' => 'Language updated.',
    'locale.invalid' => 'Unsupported language.',

    // AI
    'ai.unavailable' => 'The AI service is temporarily unavailable. Reference: :reference.',
    'ai.quota_exceeded' => 'The daily AI quota has been reached. Please try again tomorrow.',
    'market_data.unavailable' => 'Market data is temporarily unavailable.',
];
