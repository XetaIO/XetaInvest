<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

Schedule::command('portfolio:snapshot')
    ->dailyAt('22:30')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('ai:generate-portfolio-reports')
    ->dailyAt('23:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('ai:generate-global-reports')
    ->dailyAt('23:15')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('ai:generate-watchlist-reports')
    ->dailyAt('23:30')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('ai:generate-news-screener-report')
    ->dailyAt('23:45')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();
