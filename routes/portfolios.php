<?php

declare(strict_types=1);

use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CalculatorController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\SymbolController;
use App\Http\Controllers\SymbolSearchController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WatchlistController;
use App\Http\Controllers\WatchlistItemController;
use App\Http\Controllers\WatchlistSectionController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function (): void {
    Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');
    Route::get('statistics', [StatisticsController::class, 'show'])->middleware('throttle:30,1')->name('statistics');
    Route::get('news', [NewsController::class, 'show'])->middleware('throttle:20,1')->name('news');

    Route::prefix('budget')->name('budget.')->controller(BudgetController::class)->group(function (): void {
        Route::get('/', 'show')->name('show');
        Route::put('/', 'update')->name('update');
    });

    Route::get('calculator', [CalculatorController::class, 'show'])->name('calculator.show');

    Route::get('symbol-search', SymbolSearchController::class)->name('symbol.search');

    Route::prefix('symbol')->name('symbol.')->controller(SymbolController::class)->group(function (): void {
        Route::get('{symbol}', 'show')->name('show');
        Route::get('{symbol}/chart', 'chart')->name('chart');
    });

    Route::prefix('portfolios')->name('portfolios.')->controller(PortfolioController::class)->group(function (): void {
        Route::post('/', 'store')->name('store');
        Route::patch('{portfolio}', 'update')->name('update');
        Route::delete('{portfolio}', 'destroy')->name('destroy');
        Route::patch('{portfolio}/default', 'setDefault')->name('default');
    });

    Route::post('portfolios/{portfolio}/positions', [PositionController::class, 'store'])->name('positions.store');
    Route::delete('positions/{position}', [PositionController::class, 'destroy'])->name('positions.destroy');

    Route::prefix('transactions')->name('transactions.')->controller(TransactionController::class)->group(function (): void {
        Route::patch('{transaction}', 'update')->name('update');
        Route::delete('{transaction}', 'destroy')->name('destroy');
    });
    Route::post('positions/{position}/transactions', [TransactionController::class, 'store'])->name('transactions.store');

    Route::prefix('watchlists')->name('watchlists.')->group(function (): void {
        Route::controller(WatchlistController::class)->group(function (): void {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{watchlist}', 'update')->name('update');
            Route::delete('{watchlist}', 'destroy')->name('destroy');
            Route::patch('{watchlist}/reorder', 'reorder')->name('reorder');
        });

        Route::post('{watchlist}/sections', [WatchlistSectionController::class, 'store'])->name('sections.store');
        Route::post('{watchlist}/items', [WatchlistItemController::class, 'store'])->name('items.store');
    });

    Route::prefix('watchlist-sections')->name('watchlists.sections.')->controller(WatchlistSectionController::class)->group(function (): void {
        Route::patch('{section}', 'update')->name('update');
        Route::delete('{section}', 'destroy')->name('destroy');
    });

    Route::delete('watchlist-items/{item}', [WatchlistItemController::class, 'destroy'])->name('watchlists.items.destroy');
});
