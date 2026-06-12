<?php

declare(strict_types=1);

use App\Http\Controllers\Api\WatchlistApiController;
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

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');
    Route::get('statistics', [StatisticsController::class, 'show'])->middleware('throttle:30,1')->name('statistics');
    Route::get('news', [NewsController::class, 'show'])->middleware('throttle:20,1')->name('news');

    Route::get('budget', [BudgetController::class, 'show'])->name('budget.show');
    Route::put('budget', [BudgetController::class, 'update'])->name('budget.update');

    Route::get('calculator', [CalculatorController::class, 'show'])->name('calculator.show');

    Route::get('symbol-search', SymbolSearchController::class)->name('symbol.search');
    Route::get('symbol/{symbol}', [SymbolController::class, 'show'])->name('symbol.show');
    Route::get('symbol/{symbol}/chart', [SymbolController::class, 'chart'])->name('symbol.chart');

    Route::post('portfolios', [PortfolioController::class, 'store'])->name('portfolios.store');
    Route::patch('portfolios/{portfolio}', [PortfolioController::class, 'update'])->name('portfolios.update');
    Route::delete('portfolios/{portfolio}', [PortfolioController::class, 'destroy'])->name('portfolios.destroy');
    Route::patch('portfolios/{portfolio}/default', [PortfolioController::class, 'setDefault'])->name('portfolios.default');

    Route::post('portfolios/{portfolio}/positions', [PositionController::class, 'store'])->name('positions.store');
    Route::delete('positions/{position}', [PositionController::class, 'destroy'])->name('positions.destroy');

    Route::post('positions/{position}/transactions', [TransactionController::class, 'store'])->name('transactions.store');
    Route::patch('transactions/{transaction}', [TransactionController::class, 'update'])->name('transactions.update');
    Route::delete('transactions/{transaction}', [TransactionController::class, 'destroy'])->name('transactions.destroy');

    Route::get('watchlists', [WatchlistController::class, 'index'])->name('watchlists.index');
    Route::post('watchlists', [WatchlistController::class, 'store'])->name('watchlists.store');
    Route::patch('watchlists/{watchlist}', [WatchlistController::class, 'update'])->name('watchlists.update');
    Route::delete('watchlists/{watchlist}', [WatchlistController::class, 'destroy'])->name('watchlists.destroy');
    Route::patch('watchlists/{watchlist}/reorder', [WatchlistController::class, 'reorder'])->name('watchlists.reorder');
    Route::post('watchlists/{watchlist}/sections', [WatchlistSectionController::class, 'store'])->name('watchlists.sections.store');
    Route::patch('watchlist-sections/{section}', [WatchlistSectionController::class, 'update'])->name('watchlists.sections.update');
    Route::delete('watchlist-sections/{section}', [WatchlistSectionController::class, 'destroy'])->name('watchlists.sections.destroy');

    Route::post('watchlists/{watchlist}/items', [WatchlistItemController::class, 'store'])->name('watchlists.items.store');
    Route::delete('watchlist-items/{item}', [WatchlistItemController::class, 'destroy'])->name('watchlists.items.destroy');

    Route::get('api/watchlists/summary', [WatchlistApiController::class, 'summary'])->name('api.watchlists.summary');
    Route::get('api/watchlists/history', [WatchlistApiController::class, 'history'])->middleware('throttle:30,1')->name('api.watchlists.history');
});
