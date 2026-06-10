<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Ai\CreateChatSession;
use App\Actions\Ai\DeleteChatSession;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\CreateChatSessionRequest;
use App\Http\Requests\Ai\SendChatMessageRequest;
use App\Models\AiChatSession;
use App\Models\User;
use App\Services\Ai\Chat\AiChatService;
use App\Services\Ai\Exceptions\AiQuotaExceededException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    public function sessions(Request $request): JsonResponse
    {
        $sessions = AiChatSession::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'title', 'last_message_at', 'created_at']);

        return response()->json(['data' => $sessions]);
    }

    public function storeSession(
        CreateChatSessionRequest $request,
        CreateChatSession $action,
    ): JsonResponse {
        $session = $action->handle($request->user(), $request->validated('title'));

        return response()->json(['data' => $session], 201);
    }

    public function messages(Request $request, AiChatSession $session): JsonResponse
    {
        $this->authorize('view', $session);

        $messages = $session->messages()
            ->orderBy('id')
            ->get([
                'id', 'role', 'content', 'tool_calls', 'tool_call_id', 'tool_name',
                'prompt_tokens', 'completion_tokens', 'created_at',
            ]);

        return response()->json(['data' => $messages]);
    }

    public function sendMessage(SendChatMessageRequest $request, AiChatSession $session, AiChatService $service): JsonResponse
    {
        $this->authorize('update', $session);

        try {
            /** @var User $user */
            $user = $request->user();
            $assistant = $service->sendMessage(
                $user,
                $session,
                $request->string('content')->toString(),
            );
        } catch (AiQuotaExceededException) {
            return response()->json(['message' => __('messages.ai.quota_exceeded')], 429);
        }

        return response()->json([
            'data' => [
                'session' => $session->fresh(['messages' => fn ($q) => $q->orderBy('id')]),
                'assistant_message' => $assistant,
            ],
        ]);
    }

    public function destroySession(
        Request $request,
        AiChatSession $session,
        DeleteChatSession $action,
    ): JsonResponse {
        $this->authorize('delete', $session);
        $action->handle($session);

        return response()->json(['data' => true]);
    }
}
