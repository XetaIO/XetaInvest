import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useAiChat } from '@/hooks/use-ai-chat';
import { AiChatMessage } from './ai-chat-message';
import { AiChatSessionList } from './ai-chat-session-list';

export function AiChatWidget() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const {
        sessions,
        activeSession,
        messages,
        sending,
        error,
        createSession,
        selectSession,
        sendMessage,
        deleteSession,
    } = useAiChat();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, sending]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim() || sending) {
            return;
        }

        const content = input;
        setInput('');
        await sendMessage(content);
    };

    return (
        <>
            <Button
                type="button"
                size="icon"
                className="fixed right-6 bottom-6 z-40 h-12 w-12 rounded-full shadow-lg"
                onClick={() => setOpen(true)}
                aria-label={t('ai.open')}
            >
                <MessageCircle className="h-5 w-5" />
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="right"
                    className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
                >
                    <SheetHeader className="border-b px-4 py-3">
                        <SheetTitle>{t('ai.title')}</SheetTitle>
                    </SheetHeader>

                    <div className="flex min-h-0 flex-1">
                        <aside className="hidden w-56 border-r sm:block">
                            <AiChatSessionList
                                sessions={sessions}
                                activeId={activeSession?.id ?? null}
                                onSelect={(id) => void selectSession(id)}
                                onCreate={() => void createSession()}
                                onDelete={(id) => void deleteSession(id)}
                            />
                        </aside>

                        <div className="flex min-w-0 flex-1 flex-col">
                            <div
                                ref={scrollRef}
                                className="flex-1 space-y-3 overflow-y-auto p-4"
                            >
                                {messages.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('ai.empty_chat')}
                                    </p>
                                ) : (
                                    messages.map((m) => (
                                        <AiChatMessage key={m.id} message={m} />
                                    ))
                                )}
                                {sending && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {t('ai.thinking')}
                                    </div>
                                )}
                                {error && (
                                    <p className="text-xs text-destructive">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex gap-2 border-t p-3"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={t('ai.message_placeholder')}
                                    aria-label={t('ai.message_placeholder')}
                                    disabled={sending}
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={sending || !input.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
