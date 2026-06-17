<?php

declare(strict_types=1);

use App\Models\AiChatSession;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->other = User::factory()->create();
});

test('guest cannot list chat sessions', function (): void {
    $this->getJson(route('api.ai.chat.sessions'))
        ->assertUnauthorized();
});

test('user can list their chat sessions', function (): void {
    AiChatSession::query()->create([
        'user_id' => $this->user->id,
        'title' => 'Portfolio review',
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.ai.chat.sessions'))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Portfolio review');
});

test('user can create a chat session', function (): void {
    $this->actingAs($this->user)
        ->postJson(route('api.ai.chat.sessions.store'), ['title' => 'New chat'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'New chat');

    expect(AiChatSession::query()->where('user_id', $this->user->id)->count())->toBe(1);
});

test('user can view messages for their session', function (): void {
    $session = AiChatSession::query()->create([
        'user_id' => $this->user->id,
        'title' => 'Mine',
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.ai.chat.messages', $session))
        ->assertOk()
        ->assertJsonPath('data', []);
});

test('user cannot view messages for another user session', function (): void {
    $session = AiChatSession::query()->create([
        'user_id' => $this->other->id,
        'title' => 'Theirs',
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.ai.chat.messages', $session))
        ->assertForbidden();
});

test('user cannot send a message to another user session', function (): void {
    $session = AiChatSession::query()->create([
        'user_id' => $this->other->id,
        'title' => 'Theirs',
    ]);

    $this->actingAs($this->user)
        ->postJson(route('api.ai.chat.messages.send', $session), ['content' => 'Hello'])
        ->assertForbidden();
});

test('user can delete their chat session', function (): void {
    $session = AiChatSession::query()->create([
        'user_id' => $this->user->id,
        'title' => 'To delete',
    ]);

    $this->actingAs($this->user)
        ->deleteJson(route('api.ai.chat.sessions.destroy', $session))
        ->assertOk()
        ->assertJsonPath('data', true);

    expect(AiChatSession::find($session->id))->toBeNull();
});

test('user cannot delete another user chat session', function (): void {
    $session = AiChatSession::query()->create([
        'user_id' => $this->other->id,
        'title' => 'Protected',
    ]);

    $this->actingAs($this->user)
        ->deleteJson(route('api.ai.chat.sessions.destroy', $session))
        ->assertForbidden();

    expect(AiChatSession::find($session->id))->not->toBeNull();
});
