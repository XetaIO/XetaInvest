import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiChatSession } from '@/types/ai';

interface AiChatSessionListProps {
    sessions: AiChatSession[];
    activeId: number | null;
    onSelect: (id: number) => void;
    onCreate: () => void;
    onDelete: (id: number) => void;
}

export function AiChatSessionList({
    sessions,
    activeId,
    onSelect,
    onCreate,
    onDelete,
}: AiChatSessionListProps) {
    const { t } = useTranslation();

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onCreate}
                >
                    <Plus className="mr-1 h-3 w-3" />
                    {t('ai.new_conversation')}
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
                {sessions.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">
                        {t('ai.no_conversation')}
                    </p>
                ) : (
                    sessions.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                'group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                                activeId === s.id && 'bg-muted',
                            )}
                            onClick={() => onSelect(s.id)}
                        >
                            <span className="truncate">
                                {s.title ?? t('ai.untitled')}
                            </span>
                            <button
                                type="button"
                                className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(s.id);
                                }}
                                aria-label={t('common.delete')}
                            >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
