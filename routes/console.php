<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

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
    ->dailyAt('07:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping()
    ->runInBackground();
