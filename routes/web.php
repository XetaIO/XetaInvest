<?php

use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\QuotesController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => auth()->check()
    ? redirect()->route('dashboard')
    : redirect()->route('login')
)->name('home');

Route::middleware(['auth'])->prefix('api')->name('api.')->group(function (): void {
    Route::get('search', SearchController::class)->name('search');
    Route::get('quotes', QuotesController::class)->name('quotes');

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
