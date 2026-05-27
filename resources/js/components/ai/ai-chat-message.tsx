import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { AiChatMessage as AiChatMessageType } from '@/types';
import { AiToolCallTrace } from './ai-tool-call-trace';

interface AiChatMessageProps {
    message: AiChatMessageType;
}

export function AiChatMessage({ message }: AiChatMessageProps) {
    if (message.role === 'tool') {
        return null; // hidden from UI (debug only)
    }

    const isUser = message.role === 'user';

    return (
        <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                )}
            >
                {message.tool_calls && message.tool_calls.length > 0 && (
                    <div className="mb-2">
                        <AiToolCallTrace toolCalls={message.tool_calls} />
                    </div>
                )}
                {message.content && (
                    <div className={cn('prose prose-sm max-w-none', !isUser && 'dark:prose-invert')}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
