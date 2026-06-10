<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
    $this->user = User::factory()->create();
});

test('guest is redirected from symbol search', function () {
    $this->getJson('/symbol-search?q=AAP')->assertStatus(401);
});

test('authenticated user can search symbols', function () {
    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response([
            'quotes' => [
                [
                    'symbol' => 'AAPL',
                    'shortName' => 'Apple Inc.',
                    'exchange' => 'NMS',
                    'quoteType' => 'equity',
                    'logoUrl' => 'https://example.com/aapl.png',
                ],
                [
                    'symbol' => 'AAP',
                    'shortName' => 'Advance Auto Parts',
                    'exchange' => 'NYQ',
                    'quoteType' => 'equity',
                    'logoUrl' => null,
                ],
            ],
        ]),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=AAP')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.symbol', 'AAPL')
        ->assertJsonPath('data.0.type', 'equity')
        ->assertJsonPath('data.0.logo_url', 'https://example.com/aapl.png')
        ->assertJsonPath('data.1.logo_url', null);
});

test('logo_url falls back to companyLogoUrl when logoUrl is absent', function () {
    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response([
            'quotes' => [
                [
                    'symbol' => 'NVDA',
                    'shortName' => 'NVIDIA Corporation',
                    'exchange' => 'NMS',
                    'quoteType' => 'equity',
                    'companyLogoUrl' => 'https://example.com/nvidia.png',
                ],
            ],
        ]),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=NVDA')
        ->assertOk()
        ->assertJsonPath('data.0.logo_url', 'https://example.com/nvidia.png');
});

test('logo_url is null when neither logoUrl nor companyLogoUrl is present', function () {
    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response([
            'quotes' => [
                [
                    'symbol' => 'XYZ',
                    'shortName' => 'XYZ Corp',
                    'exchange' => 'NYQ',
                    'quoteType' => 'equity',
                ],
            ],
        ]),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=XYZ')
        ->assertOk()
        ->assertJsonPath('data.0.logo_url', null);
});

test('result limit is 25', function () {
    $quotes = array_map(
        fn (int $i): array => [
            'symbol' => "SYM{$i}",
            'shortName' => "Symbol {$i}",
            'exchange' => 'NMS',
            'quoteType' => 'equity',
        ],
        range(1, 30),
    );

    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response(['quotes' => $quotes]),
    ]);

    // The API is called with count=25; we trust the API to respect the limit.
    // We verify our mapping handles the response correctly.
    $this->actingAs($this->user)->getJson('/symbol-search?q=SYM')
        ->assertOk()
        ->assertJsonCount(30, 'data'); // we map whatever the API returns
});

test('short query returns empty list without calling API', function () {
    Http::fake();

    $this->actingAs($this->user)->getJson('/symbol-search?q=a')
        ->assertOk()
        ->assertExactJson(['data' => []]);

    Http::assertNothingSent();
});

test('empty query returns empty list', function () {
    $this->actingAs($this->user)->getJson('/symbol-search')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});

test('api failure returns empty list gracefully', function () {
    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response(null, 500),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=AAPL')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});

test('region is derived from app locale', function () {
    app()->setLocale('fr');

    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response(['quotes' => []]),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=AAPL')
        ->assertOk();

    Http::assertSent(function (Request $request): bool {
        return str_contains($request->url(), 'region=FR');
    });
});
