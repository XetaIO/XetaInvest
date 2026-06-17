<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Ai\CreateChatSession;
use App\Actions\Ai\DeleteChatSession;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\CreateChatSessionRequest;
use App\Http\Requests\Ai\DeleteChatSessionRequest;
use App\Http\Requests\Ai\SendChatMessageRequest;
use App\Http\Requests\Ai\ShowChatMessagesRequest;
use App\Models\AiChatSession;
use App\Models\User;
use App\Services\Ai\Chat\AiChatService;
use App\Services\Ai\Exceptions\AiQuotaExceededException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    /**
     * Retrieve a list of AI chat sessions for the authenticated user.
     *
     * @param Request $request The incoming HTTP request.
     *
     * @return JsonResponse A JSON response containing the list of chat sessions.
     */
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

    /**
     * Create a new AI chat session for the authenticated user.
     *
     * @param CreateChatSessionRequest $request The validated request containing the title for the new chat session.
     * @param CreateChatSession $action The action responsible for creating the chat session.
     *
     * @return JsonResponse A JSON response containing the newly created chat session.
     */
    public function storeSession(
        CreateChatSessionRequest $request,
        CreateChatSession $action,
    ): JsonResponse {
        $session = $action->handle($request->user(), $request->validated('title'));

        return response()->json(['data' => $session], 201);
    }

    /**
     * Retrieve the messages for a specific AI chat session.
     *
     * @param Request $request The incoming HTTP request.
     * @param AiChatSession $session The chat session for which messages are being retrieved.
     *
     * @return JsonResponse A JSON response containing the list of messages for the specified chat session.
     */
    public function messages(ShowChatMessagesRequest $request, AiChatSession $session): JsonResponse
    {
        $messages = $session->messages()
            ->orderBy('id')
            ->get([
                'id', 'role', 'content', 'tool_calls', 'tool_call_id', 'tool_name',
                'prompt_tokens', 'completion_tokens', 'created_at',
            ]);

        return response()->json(['data' => $messages]);
    }

    /**
     * Send a message to the AI chat session and receive a response.
     *
     * @param SendChatMessageRequest $request The validated request containing the message content.
     * @param AiChatSession $session The chat session to which the message is being sent.
     * @param AiChatService $service The service responsible for handling AI chat interactions.
     *
     * @return JsonResponse A JSON response containing the updated chat session and the assistant's response message.
     */
    public function sendMessage(SendChatMessageRequest $request, AiChatSession $session, AiChatService $service): JsonResponse
    {
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

    /**
     * Delete a specific AI chat session for the authenticated user.
     *
     * @param Request $request The incoming HTTP request.
     * @param AiChatSession $session The chat session to be deleted.
     * @param DeleteChatSession $action The action responsible for deleting the chat session.
     *
     * @return JsonResponse A JSON response indicating the success of the deletion operation.
     */
    public function destroySession(
        DeleteChatSessionRequest $request,
        AiChatSession $session,
        DeleteChatSession $action,
    ): JsonResponse {
        $action->handle($session);

        return response()->json(['data' => true]);
    }
}
