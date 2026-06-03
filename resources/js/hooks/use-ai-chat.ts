import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { AiChatMessage, AiChatSession } from '@/types';

interface UseAiChatResult {
    sessions: AiChatSession[];
    activeSession: AiChatSession | null;
    messages: AiChatMessage[];
    loading: boolean;
    sending: boolean;
    error: string | null;
    loadSessions: () => Promise<void>;
    createSession: () => Promise<AiChatSession | null>;
    selectSession: (id: number) => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    deleteSession: (id: number) => Promise<void>;
}

export function useAiChat(): UseAiChatResult {
    const [sessions, setSessions] = useState<AiChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<AiChatSession | null>(null);
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    const loadSessions = useCallback(async () => {
        try {
            const data = await apiFetch<{ data: AiChatSession[] }>('/api/ai/chat/sessions');
            setSessions(data.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'load_failed');
        }
    }, []);

    const createSession = useCallback(async (): Promise<AiChatSession | null> => {
        try {
            const data = await apiFetch<{ data: AiChatSession }>('/api/ai/chat/sessions', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            setSessions((prev) => [data.data, ...prev]);
            setActiveSession(data.data);
            setMessages([]);

            return data.data;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'create_failed');

            return null;
        }
    }, []);

    const selectSession = useCallback(
        async (id: number) => {
            setLoading(true);

            try {
                const session = sessions.find((s) => s.id === id) ?? null;
                setActiveSession(session);
                const data = await apiFetch<{ data: AiChatMessage[] }>(
                    `/api/ai/chat/sessions/${id}/messages`,
                );
                setMessages(data.data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'fetch_failed');
            } finally {
                setLoading(false);
            }
        },
        [sessions],
    );

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim()) {
                return;
            }

            let session = activeSession;

            if (!session) {
                session = await createSession();

                if (!session) {
                    return;
                }
            }

            const optimistic: AiChatMessage = {
                id: -Date.now(),
                role: 'user',
                content,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimistic]);
            setSending(true);
            setError(null);

            try {
                const data = await apiFetch<{
                    data: { assistant_message: AiChatMessage; session: AiChatSession };
                }>(`/api/ai/chat/sessions/${session.id}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ content }),
                });

                const refreshed = await apiFetch<{ data: AiChatMessage[] }>(
                    `/api/ai/chat/sessions/${session.id}/messages`,
                );
                setMessages(refreshed.data);

                setSessions((prev) => {
                    const others = prev.filter((s) => s.id !== data.data.session.id);

                    return [data.data.session, ...others];
                });
            } catch (e) {
                setError(e instanceof Error ? e.message : 'send_failed');
                setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            } finally {
                setSending(false);
            }
        },
        [activeSession, createSession],
    );

    const deleteSession = useCallback(
        async (id: number) => {
            try {
                await apiFetch(`/api/ai/chat/sessions/${id}`, { method: 'DELETE' });
                setSessions((prev) => prev.filter((s) => s.id !== id));

                if (activeSession?.id === id) {
                    setActiveSession(null);
                    setMessages([]);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'delete_failed');
            }
        },
        [activeSession],
    );

    useEffect(() => {
        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        void loadSessions();
    }, [loadSessions]);

    return {
        sessions,
        activeSession,
        messages,
        loading,
        sending,
        error,
        loadSessions,
        createSession,
        selectSession,
        sendMessage,
        deleteSession,
    };
}
