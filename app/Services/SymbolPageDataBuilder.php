<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SymbolPageDataBuilder
{
    /**
     * Mapping (range => [interval, range]) for the FinanceQuery chart endpoint.
     */
    public const RANGES = [
        '1d' => ['5m', '1d'],
        '5d' => ['15m', '5d'],
        '1mo' => ['1d', '1mo'],
        '3mo' => ['1d', '3mo'],
        '6mo' => ['1d', '6mo'],
        '1y' => ['1d', '1y'],
        '2y' => ['1wk', '2y'],
        '5y' => ['1wk', '5y'],
        '10y' => ['1mo', '10y'],
        'ytd' => ['1d', 'ytd'],
    ];

    /**
     * Default range for the chart if none is specified or if an invalid range is provided.
     */
    public const DEFAULT_RANGE = '1mo';

    /**
     * Limit for the number of news articles to fetch for a symbol.
     */
    public const NEWS_LIMIT = 3;

    /**
     * Limit for the number of recommendations to fetch for a symbol.
     */
    public const RECOMMENDATIONS_LIMIT = 5;

    /**
     * Show the symbol page with quote, chart, news, and recommendations.
     *
     * @param Request $request The incoming HTTP request.
     * @param string $symbol The symbol for which to display data.
     * @param FinanceQueryClient $client The client used to fetch financial data.
     *
     * @return Response The Inertia response rendering the symbol page.
     */
    public function show(Request $request, string $symbol, FinanceQueryClient $client): Response
    {
        $symbol = strtoupper(trim($symbol));

        $quote = null;
        $quoteError = null;

        try {
            $quote = $client->quoteDetail($symbol);
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol quote fetch failed', ['symbol' => $symbol, 'error' => $e->getMessage()]);
            $quoteError = 'Impossible de récupérer la cotation pour le moment.';
        }

        $news = [];

        try {
            $rawNews = $client->news($symbol);
            $news = $this->normalizeNews(array_slice($rawNews, 0, self::NEWS_LIMIT));
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol news fetch failed', ['symbol' => $symbol, 'error' => $e->getMessage()]);
        }

        $recommendations = [];

        try {
            $rawRecommendations = $client->recommendations($symbol, self::RECOMMENDATIONS_LIMIT);
            $recommendations = $this->enrichRecommendations($client, $rawRecommendations);
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol recommendations fetch failed', ['symbol' => $symbol, 'error' => $e->getMessage()]);
        }

        $range = self::DEFAULT_RANGE;
        $points = [];

        if ($quote !== null) {
            $points = $this->fetchChartPoints($client, $symbol, $range);
        }

        return Inertia::render('symbol', [
            'symbol' => $symbol,
            'quote' => $quote ? $this->normalizeQuote($symbol, $quote) : null,
            'quote_error' => $quoteError,
            'chart' => [
                'range' => $range,
                'points' => $points,
            ],
            'news' => $news,
            'recommendations' => $recommendations,
            'available_ranges' => array_keys(self::RANGES),
        ]);
    }

    /**
     * Fetches the chart points for a given symbol and range using the FinanceQueryClient.
     *
     * @param Request $request The incoming HTTP request.
     * @param string $symbol The symbol for which to fetch chart points.
     * @param FinanceQueryClient $client The client used to fetch financial data.
     *
     * @return array An array of chart points, each containing date, close price, and optionally open, high, low, and volume.
     */
    public function chart(Request $request, string $symbol, FinanceQueryClient $client): JsonResponse
    {
        $symbol = strtoupper(trim($symbol));
        $range = (string) $request->query('range', self::DEFAULT_RANGE);

        if (! isset(self::RANGES[$range])) {
            $range = self::DEFAULT_RANGE;
        }

        try {
            $points = $this->fetchChartPoints($client, $symbol, $range);
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol chart fetch failed', ['symbol' => $symbol, 'range' => $range, 'error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Chart unavailable.',
            ], 503);
        }

        return response()->json([
            'symbol' => $symbol,
            'range' => $range,
            'points' => $points,
        ]);
    }

    /**
     * Fetches chart points for a given symbol and range using the FinanceQueryClient.
     *
     * @param FinanceQueryClient $client The client used to fetch financial data.
     * @param string $symbol The symbol for which to fetch chart points.
     * @param string $range The range for which to fetch chart points (e.g., '1d', '5d', '1mo').
     *
     * @return array An array of chart points, each containing date, close price, and optionally open, high, low, and volume.
     *
     * @throws FinanceQueryException If there is an error fetching the chart data.
     */
    protected function fetchChartPoints(FinanceQueryClient $client, string $symbol, string $range): array
    {
        [$interval, $apiRange] = self::RANGES[$range];

        try {
            $payload = $client->chart($symbol, $interval, $apiRange);
        } catch (FinanceQueryException $e) {
            throw $e;
        }

        $candles = $payload['candles'] ?? $payload['data'] ?? $payload;

        if (! is_array($candles)) {
            return [];
        }

        $points = [];

        foreach ($candles as $row) {
            if (! is_array($row)) {
                continue;
            }

            $date = $row['date'] ?? $row['timestamp'] ?? $row['time'] ?? null;
            $close = $row['close'] ?? $row['adjclose'] ?? null;

            if ($date === null || $close === null) {
                continue;
            }

            $points[] = [
                'date' => (string) $date,
                'close' => (float) $close,
                'open' => isset($row['open']) ? (float) $row['open'] : null,
                'high' => isset($row['high']) ? (float) $row['high'] : null,
                'low' => isset($row['low']) ? (float) $row['low'] : null,
                'volume' => isset($row['volume']) ? (int) $row['volume'] : null,
            ];
        }

        return $points;
    }

    /**
     * Normalizes the quote data for a given symbol, extracting relevant fields and ensuring consistent types.
     *
     * @param string $symbol The symbol for which the quote data is being normalized.
     * @param array $payload The raw quote data fetched from the FinanceQueryClient.
     *
     * @return array An associative array containing normalized quote data for the symbol.
     */
    protected function normalizeQuote(string $symbol, array $payload): array
    {
        $get = static function (string ...$keys) use ($payload) {
            foreach ($keys as $key) {
                $value = $payload[$key] ?? null;

                if ($value === null || $value === '' || (is_array($value) && $value === [])) {
                    continue;
                }

                return $value;
            }

            return null;
        };

        return [
            // Identity
            'symbol' => (string) ($get('symbol') ?? $symbol),
            'name' => $get('name', 'longName', 'shortName'),
            'short_name' => $get('shortName'),
            'exchange' => $get('exchange', 'fullExchangeName', 'exchangeName'),
            'exchange_name' => $get('exchangeName', 'fullExchangeName'),
            'currency' => $get('currency'),
            'currency_symbol' => $get('currencySymbol'),
            'type' => $get('quoteType', 'type'),
            'market_state' => $get('marketState'),

            // Profile
            'sector' => $get('sector', 'sectorDisp'),
            'industry' => $get('industry', 'industryDisp'),
            'country' => $get('country'),
            'city' => $get('city'),
            'website' => $get('website'),
            'long_business_summary' => $get('longBusinessSummary'),
            'full_time_employees' => $this->intOrNull($get('fullTimeEmployees')),

            // Price
            'price' => $this->floatOrNull($get('price', 'regularMarketPrice', 'currentPrice')),
            'change' => $this->floatOrNull($get('change', 'regularMarketChange')),
            'change_percent' => $this->floatOrNull($get('changePercent', 'regularMarketChangePercent', 'percentChange')),
            'previous_close' => $this->floatOrNull($get('previousClose', 'regularMarketPreviousClose')),
            'open' => $this->floatOrNull($get('open', 'regularMarketOpen')),
            'day_high' => $this->floatOrNull($get('dayHigh', 'regularMarketDayHigh')),
            'day_low' => $this->floatOrNull($get('dayLow', 'regularMarketDayLow')),
            'bid' => $this->floatOrNull($get('bid')),
            'ask' => $this->floatOrNull($get('ask')),

            // 52w / averages / all-time
            'fifty_two_week_high' => $this->floatOrNull($get('fiftyTwoWeekHigh', 'yearHigh')),
            'fifty_two_week_low' => $this->floatOrNull($get('fiftyTwoWeekLow', 'yearLow')),
            'fifty_two_week_change' => $this->floatOrNull($payload['52WeekChange'] ?? null),
            'fifty_day_average' => $this->floatOrNull($get('fiftyDayAverage')),
            'two_hundred_day_average' => $this->floatOrNull($get('twoHundredDayAverage')),
            'all_time_high' => $this->floatOrNull($get('allTimeHigh')),
            'all_time_low' => $this->floatOrNull($get('allTimeLow')),

            // Volume
            'volume' => $this->intOrNull($get('volume', 'regularMarketVolume')),
            'avg_volume' => $this->intOrNull($get('averageVolume', 'averageDailyVolume3Month')),
            'avg_volume_10d' => $this->intOrNull($get('averageDailyVolume10Day', 'averageVolume10days')),

            // Valuation
            'market_cap' => $this->floatOrNull($get('marketCap')),
            'enterprise_value' => $this->floatOrNull($get('enterpriseValue')),
            'pe' => $this->floatOrNull($get('pe', 'trailingPE', 'peRatio')),
            'forward_pe' => $this->floatOrNull($get('forwardPE')),
            'price_to_book' => $this->floatOrNull($get('priceToBook')),
            'price_to_sales' => $this->floatOrNull($get('priceToSalesTrailing12Months')),
            'book_value' => $this->floatOrNull($get('bookValue')),
            'enterprise_to_revenue' => $this->floatOrNull($get('enterpriseToRevenue')),
            'enterprise_to_ebitda' => $this->floatOrNull($get('enterpriseToEbitda')),

            // Profitability
            'eps' => $this->floatOrNull($get('eps', 'trailingEps', 'epsTrailingTwelveMonths')),
            'forward_eps' => $this->floatOrNull($get('forwardEps')),
            'ebitda' => $this->floatOrNull($get('ebitda')),
            'ebitda_margins' => $this->floatOrNull($get('ebitdaMargins')),
            'gross_margins' => $this->floatOrNull($get('grossMargins')),
            'operating_margins' => $this->floatOrNull($get('operatingMargins')),
            'profit_margins' => $this->floatOrNull($get('profitMargins')),
            'return_on_assets' => $this->floatOrNull($get('returnOnAssets')),
            'return_on_equity' => $this->floatOrNull($get('returnOnEquity')),
            'revenue' => $this->floatOrNull($get('totalRevenue')),
            'revenue_growth' => $this->floatOrNull($get('revenueGrowth')),
            'revenue_per_share' => $this->floatOrNull($get('revenuePerShare')),
            'gross_profits' => $this->floatOrNull($get('grossProfits')),

            // Financial health
            'total_cash' => $this->floatOrNull($get('totalCash')),
            'total_cash_per_share' => $this->floatOrNull($get('totalCashPerShare')),
            'total_debt' => $this->floatOrNull($get('totalDebt')),
            'debt_to_equity' => $this->floatOrNull($get('debtToEquity')),
            'current_ratio' => $this->floatOrNull($get('currentRatio')),
            'quick_ratio' => $this->floatOrNull($get('quickRatio')),
            'free_cashflow' => $this->floatOrNull($get('freeCashflow')),
            'operating_cashflow' => $this->floatOrNull($get('operatingCashflow')),

            // Shares
            'shares_outstanding' => $this->floatOrNull($get('sharesOutstanding', 'impliedSharesOutstanding')),
            'float_shares' => $this->floatOrNull($get('floatShares')),
            'held_percent_insiders' => $this->floatOrNull($get('heldPercentInsiders')),
            'held_percent_institutions' => $this->floatOrNull($get('heldPercentInstitutions')),

            // Dividends
            'dividend_rate' => $this->floatOrNull($get('dividendRate', 'trailingAnnualDividendRate')),
            'dividend_yield' => $this->floatOrNull($get('dividendYield', 'trailingAnnualDividendYield')),
            'payout_ratio' => $this->floatOrNull($get('payoutRatio')),

            // Risk
            'beta' => $this->floatOrNull($get('beta')),

            // Analyst
            'target_mean_price' => $this->floatOrNull($get('targetMeanPrice')),
            'target_high_price' => $this->floatOrNull($get('targetHighPrice')),
            'target_low_price' => $this->floatOrNull($get('targetLowPrice')),
            'target_median_price' => $this->floatOrNull($get('targetMedianPrice')),
            'number_of_analyst_opinions' => $this->intOrNull($get('numberOfAnalystOpinions')),
            'recommendation_key' => $get('recommendationKey'),
        ];
    }

    /**
     * Normalizes the news articles for a given symbol, ensuring consistent structure and valid links.
     *
     * @param array $rows The raw news articles fetched from the FinanceQueryClient.
     *
     * @return array An array of normalized news articles, each containing title, link, source, image, and time.
     */
    protected function normalizeNews(array $rows): array
    {
        $out = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $link = trim((string) ($row['link'] ?? ''));

            if ($link !== '' && preg_match('#^https?://#i', $link) !== 1) {
                $link = 'https://stockanalysis.com/'.ltrim($link, '/');
            }

            $out[] = [
                'title' => (string) ($row['title'] ?? ''),
                'link' => $link,
                'source' => (string) ($row['source'] ?? ''),
                'image' => isset($row['img']) && $row['img'] !== '' ? (string) $row['img'] : null,
                'time' => (string) ($row['time'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * Enriches the recommendations for a given symbol by fetching additional details such as names from the FinanceQueryClient.
     *
     * @param FinanceQueryClient $client The client used to fetch financial data.
     * @param array $recommendations The raw recommendations fetched from the FinanceQueryClient.
     *
     * @return array An array of enriched recommendations, each containing symbol, name, and score.
     */
    protected function enrichRecommendations(FinanceQueryClient $client, array $recommendations): array
    {
        if ($recommendations === []) {
            return [];
        }

        $symbols = array_map(static fn (array $r): string => $r['symbol'], $recommendations);

        try {
            $quotes = $client->quotes($symbols);
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol recommendations quotes fetch failed', ['error' => $e->getMessage()]);
            $quotes = [];
        }

        return array_map(static function (array $item) use ($quotes): array {
            $quote = $quotes[$item['symbol']] ?? null;
            $name = null;

            if (is_array($quote)) {
                $name = $quote['longName'] ?? $quote['shortName'] ?? $quote['name'] ?? null;
            }

            return [
                'symbol' => $item['symbol'],
                'name' => $name !== null ? (string) $name : null,
                'score' => $item['score'],
            ];
        }, $recommendations);
    }

    /**
     * Converts a value to a float if it is numeric, otherwise returns null.
     *
     * @param mixed $value The value to convert.
     *
     * @return float|null The converted float value or null if not numeric.
     */
    protected function floatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * Converts a value to an integer if it is numeric, otherwise returns null.
     *
     * @param mixed $value The value to convert.
     *
     * @return int|null The converted integer value or null if not numeric.
     */
    protected function intOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }
}
