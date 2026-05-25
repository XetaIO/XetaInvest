<?php

namespace App\Providers;

use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Tools\AiToolRegistry;
use App\Services\Ai\Tools\Concrete\GetNewsTool;
use App\Services\Ai\Tools\Concrete\GetPortfolioDetailTool;
use App\Services\Ai\Tools\Concrete\GetPortfolioSnapshotsTool;
use App\Services\Ai\Tools\Concrete\GetPortfoliosTool;
use App\Services\Ai\Tools\Concrete\GetQuoteTool;
use App\Services\Ai\Tools\Concrete\GetWatchlistsTool;
use App\Services\Ai\Tools\Concrete\ScreenStocksTool;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AiManager::class);
        $this->app->singleton(AiUsageLogger::class);

        $this->app->singleton(AiToolRegistry::class, function ($app): AiToolRegistry {
            $registry = new AiToolRegistry();
            $registry->registerMany([
                $app->make(GetPortfoliosTool::class),
                $app->make(GetPortfolioDetailTool::class),
                $app->make(GetWatchlistsTool::class),
                $app->make(GetQuoteTool::class),
                $app->make(GetNewsTool::class),
                $app->make(ScreenStocksTool::class),
                $app->make(GetPortfolioSnapshotsTool::class),
            ]);

            return $registry;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
