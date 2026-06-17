<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\QuotesController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\WatchlistApiController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

Route::get(
    '/',
    fn (): RedirectResponse|Response => auth()->check()
        ? redirect()->route('dashboard')
        : Inertia::render('welcome')
)->name('home');

Route::middleware('auth')->prefix('api')->name('api.')->group(function (): void {
    // Market data
    Route::get('search', SearchController::class)->middleware('throttle:60,1')->name('search');
    Route::get('quotes', QuotesController::class)->middleware('throttle:30,1')->name('quotes');

    // Watchlists
    Route::prefix('watchlists')->name('watchlists.')->group(function (): void {
        Route::get('summary', [WatchlistApiController::class, 'summary'])->name('summary');
        Route::get('history', [WatchlistApiController::class, 'history'])
            ->middleware('throttle:30,1')
            ->name('history');
    });

    // AI chat
    Route::prefix('ai/chat')->name('ai.chat.')->middleware('throttle:30,1')->group(function (): void {
        Route::get('sessions', [AiChatController::class, 'sessions'])->name('sessions');
        Route::post('sessions', [AiChatController::class, 'storeSession'])->name('sessions.store');
        Route::get('sessions/{session}/messages', [AiChatController::class, 'messages'])->name('messages');
        Route::post('sessions/{session}/messages', [AiChatController::class, 'sendMessage'])->name('messages.send');
        Route::delete('sessions/{session}', [AiChatController::class, 'destroySession'])->name('sessions.destroy');
    });
});

require __DIR__.'/portfolios.php';
require __DIR__.'/settings.php';
