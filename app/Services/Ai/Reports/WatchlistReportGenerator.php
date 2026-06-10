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

    public function type(): string
    {
        return AiReportType::Watchlist->value;
    }

    public function scopeType(): ?string
    {
        return null;
    }

    protected function purpose(): string
    {
        return 'report_watchlist';
    }

    protected function buildMessages(User $user, mixed $scope): array
    {
        $context = $this->watchlistsTool->execute($user, ['with_quotes' => true]);

        return [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Analyse les watchlists de l'utilisateur et propose un classement des titres les plus intéressants à investir maintenant. Pour chaque recommandation, justifie brièvement (momentum, valorisation, secteur). Limite-toi aux titres présents.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
