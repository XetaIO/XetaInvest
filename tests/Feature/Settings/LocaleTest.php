<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create(['locale' => 'fr']);
});

describe('SetLocale middleware', function (): void {
    test('defaults to French for unauthenticated users', function (): void {
        $response = $this->get('/login');

        $response->assertOk();
        expect(app()->getLocale())->toBe('fr');
    });

    test('uses authenticated user locale', function (): void {
        $this->user->update(['locale' => 'en']);

        $this->actingAs($this->user)->get('/login');

        expect(app()->getLocale())->toBe('en');
    });
});

describe('LocaleController', function (): void {
    test('guest can switch locale through a persistent cookie', function (): void {
        $response = $this->patch('/settings/locale', ['locale' => 'en']);

        $response
            ->assertRedirect()
            ->assertPlainCookie('locale', 'en');
    });

    test('authenticated user can switch to English', function (): void {
        $response = $this->actingAs($this->user)
            ->patch('/settings/locale', ['locale' => 'en']);

        $response->assertRedirect();
        expect($this->user->fresh()->locale)->toBe('en');
    });

    test('authenticated user can switch to French', function (): void {
        $this->user->update(['locale' => 'en']);

        $response = $this->actingAs($this->user)
            ->patch('/settings/locale', ['locale' => 'fr']);

        $response->assertRedirect();
        expect($this->user->fresh()->locale)->toBe('fr');
    });

    test('rejects unsupported locale', function (): void {
        $response = $this->actingAs($this->user)
            ->patch('/settings/locale', ['locale' => 'de']);

        $response
            ->assertRedirect()
            ->assertSessionHasErrors('locale');
        expect($this->user->fresh()->locale)->toBe('fr');
    });

    test('guest cannot persist an unsupported locale', function (): void {
        $response = $this->patch('/settings/locale', ['locale' => 'de']);

        $response
            ->assertRedirect()
            ->assertSessionHasErrors('locale')
            ->assertCookieMissing('locale');
    });
});
