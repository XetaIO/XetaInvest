<?php

declare(strict_types=1);

return [
    // PortfolioController
    'portfolio.created' => 'Portefeuille créé.',
    'portfolio.updated' => 'Portefeuille mis à jour.',
    'portfolio.deleted' => 'Portefeuille supprimé.',
    'portfolio.limit_reached' => 'Le nombre maximal de portefeuilles est atteint.',

    // PositionController
    'position.symbol_not_found' => 'Symbole introuvable.',
    'position.added' => 'Investissement ajouté.',
    'position.deleted' => 'Position supprimée.',

    // WatchlistController
    'watchlist.created' => 'Liste de suivi créée.',
    'watchlist.renamed' => 'Liste renommée.',
    'watchlist.deleted' => 'Liste supprimée.',
    'watchlist.limit_reached' => 'Le nombre maximal de listes de suivi est atteint.',
    'watchlist.invalid_order' => 'La liste ordonnée doit contenir exactement tous les éléments suivis.',
    'watchlist.invalid_layout' => 'La disposition doit contenir exactement toutes les sections et tous les symboles.',
    'watchlist.default_section' => 'Général',

    // WatchlistSectionController
    'watchlist_section.created' => 'Section créée.',
    'watchlist_section.renamed' => 'Section renommée.',
    'watchlist_section.deleted' => 'Section supprimée.',
    'watchlist_section.default_protected' => 'La section par défaut ne peut pas être supprimée.',

    // TransactionController
    'transaction.added' => 'Transaction ajoutée.',
    'transaction.updated' => 'Transaction mise à jour.',
    'transaction.deleted' => 'Transaction supprimée.',
    'transaction.insufficient_quantity' => 'Cette opération créerait une quantité détenue négative à la date indiquée.',

    // WatchlistItemController
    'watchlist_item.symbol_not_found' => 'Symbole introuvable.',
    'watchlist_item.already_present' => 'Symbole déjà présent.',
    'watchlist_item.moved' => 'Symbole déplacé.',
    'watchlist_item.added' => 'Symbole ajouté.',
    'watchlist_item.removed' => 'Symbole retiré.',

    // Settings
    'profile.updated' => 'Profil mis à jour.',
    'password.updated' => 'Mot de passe mis à jour.',
    'locale.updated' => 'Langue mise à jour.',
    'locale.invalid' => 'Langue non supportée.',

    // AI
    'ai.unavailable' => 'Le service IA est temporairement indisponible. Référence : :reference.',
    'ai.quota_exceeded' => 'Le quota IA quotidien est atteint. Réessayez demain.',
    'market_data.unavailable' => 'Les données de marché sont temporairement indisponibles.',
];
