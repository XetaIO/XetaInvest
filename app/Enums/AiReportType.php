<?php

namespace App\Enums;

enum AiReportType: string
{
    case Portfolio = 'portfolio';
    case Global = 'global';
    case Watchlist = 'watchlist';
    case NewsScreener = 'news_screener';

    public function label(): string
    {
        return match ($this) {
            self::Portfolio => 'Rapport portefeuille',
            self::Global => 'Rapport global',
            self::Watchlist => 'Rapport liste de suivi',
            self::NewsScreener => 'Rapport opportunités marché',
        };
    }
}
