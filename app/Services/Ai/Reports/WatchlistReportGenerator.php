<?php

declare(strict_types=1);

namespace App\Services\Ai\Reports;

use App\Enums\AiReportType;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Tools\Concrete\GetWatchlistsTool;

class WatchlistReportGenerator extends BaseReportGenerator
{
    public function __construct(
        AiManager $manager,
        AiUsageLogger $usage,
        protected GetWatchlistsTool $watchlistsTool,
    ) {
        parent::__construct($manager, $usage);
    }

    /**
     * Returns the type of the report being generated, which is 'watchlist' for this generator.
     *
     * @return string The report type as a string.
     */
    public function type(): string
    {
        return AiReportType::Watchlist->value;
    }

    public function scopeType(): ?string
    {
        return null;
    }

    /**
     * Returns the purpose of the report, which is 'report_watchlist' for this generator.
     *
     * @return string The purpose of the report as a string.
     */
    protected function purpose(): string
    {
        return 'report_watchlist';
    }

    /**
     * Builds the messages to be sent to the AI for generating the watchlist report, including system and user messages with relevant context.
     *
     * @param User $user The user for whom the report is being generated.
     * @param mixed $scope The scope of the report, which is not used in this generator.
     *
     * @return array<int, array<string, mixed>> An array of messages formatted for the AI chat.
     */
    protected function buildMessages(User $user, mixed $scope): array
    {
        $context = $this->watchlistsTool->execute($user, ['with_quotes' => true]);

        return [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Analyse les watchlists de l'utilisateur et propose un classement des titres les plus intéressants à investir maintenant. Pour chaque recommandation, justifie brièvement (momentum, valorisation, secteur). Limite-toi aux titres présents.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
