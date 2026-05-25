import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import type { AiToolCall } from '@/types';

interface AiToolCallTraceProps {
    toolCalls: AiToolCall[];
}

export function AiToolCallTrace({ toolCalls }: AiToolCallTraceProps) {
    if (!toolCalls?.length) return null;

    return (
        <div className="space-y-1">
            {toolCalls.map((tc) => (
                <div key={tc.id} className="flex items-start gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs">
                    <Wrench className="mt-0.5 h-3 w-3 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="font-mono text-[10px]">
                            {tc.name}
                        </Badge>
                        {Object.keys(tc.arguments ?? {}).length > 0 && (
                            <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                                {JSON.stringify(tc.arguments, null, 0)}
                            </pre>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
