<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools;

/**
 * Whitelist of fields and operators allowed when the AI calls the screener tool.
 *
 * Mirrors the fields documented for POST /v2/screeners/custom.
 */
final class AiScreenerFieldRegistry
{
    /**
     * Allowed comparison operators.
     *
     * @var array<int, string>
     */
    public const OPERATORS = ['eq', 'gt', 'gte', 'lt', 'lte', 'btwn'];

    /**
     * Allowed quote types.
     *
     * @var array<int, string>
     */
    public const QUOTE_TYPES = ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CURRENCY', 'CRYPTOCURRENCY'];

    /**
     * Allowed filter / sort / select fields.
     *
     * @var array<int, string>
     */
    public const FIELDS = [
        // Identity / market
        'region', 'exchange', 'sector', 'industry', 'currency', 'quote_type',
        // Price & market cap
        'intradayprice', 'percentchange', 'intradaymarketcap', 'avgdailyvol3m',
        // Valuation
        'peratio.lasttwelvemonths', 'forwardpe', 'pegratio', 'pricebookratio.quarterly',
        'pricesalesratio.quarterly', 'evtorevenue', 'evtoebitda',
        // Growth
        'quarterlyrevenuegrowth.quarterly', 'epsgrowth.lasttwelvemonths',
        'returnonassets.lasttwelvemonths', 'returnonequity.lasttwelvemonths',
        // Profitability
        'grossmargin', 'operatingmargin.lasttwelvemonths', 'profitmargin',
        // Dividends
        'dividendyield', 'forwarddividendyield', 'payoutratio',
        // Balance sheet
        'totaldebt.quarterly', 'totalcashpershare.quarterly', 'currentratio.quarterly',
        // Performance
        'fiftytwowkpercentchange', 'percentchangefromfiftytwoweekhigh',
    ];

    public static function isField(string $field): bool
    {
        return in_array($field, self::FIELDS, true);
    }

    public static function isOperator(string $op): bool
    {
        return in_array($op, self::OPERATORS, true);
    }
}
