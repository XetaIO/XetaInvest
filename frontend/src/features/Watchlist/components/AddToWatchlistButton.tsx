import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '../../../shared/components/ui/button/Button';
import { Dropdown } from '../../../shared/components/ui/dropdown/Dropdown';
import {
    addWatchlistItem,
    watchlistSummaryQueryOptions,
    WATCHLIST_QUERY_KEY,
    WATCHLIST_SUMMARY_KEY,
} from '../api/watchlists';

type Props = {
    symbol: string;
};

export function AddToWatchlistButton({ symbol }: Props) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const summary = useQuery(watchlistSummaryQueryOptions());
    const lists = summary.data?.data ?? [];

    const add = useMutation({
        mutationFn: (list: {
            id: number;
            default_section_id: number | null;
        }) => {
            if (!list.default_section_id) {
                throw new Error(t('watchlist.item_status_error'));
            }
            return addWatchlistItem(list.id, {
                symbol,
                section_id: list.default_section_id,
            });
        },
        onSuccess: (payload) => {
            void queryClient.invalidateQueries({
                queryKey: WATCHLIST_QUERY_KEY,
            });
            void queryClient.invalidateQueries({
                queryKey: WATCHLIST_SUMMARY_KEY,
            });
            const key =
                payload.status === 'moved' ||
                payload.status === 'already_present' ||
                payload.status === 'added'
                    ? `watchlist.${payload.status}`
                    : 'watchlist.added';
            setMessage(t(key));
            setOpen(false);
        },
        onError: () => {
            setMessage(t('watchlist.item_status_error'));
        },
    });

    return (
        <div className="relative">
            <Button
                type="button"
                size="xs"
                variant="secondary"
                className="dropdown-toggle"
                onClick={() => setOpen((value) => !value)}
            >
                <ListPlus className="h-3.5 w-3.5" />
                {t('watchlist.add_to_list')}
            </Button>
            <Dropdown
                isOpen={open}
                onClose={() => setOpen(false)}
                className="min-w-56 p-1"
            >
                {lists.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">
                        {t('watchlist.add_to_empty')}{' '}
                        <Link
                            to="/watchlists"
                            className="text-brand-600 underline"
                        >
                            {t('watchlist.title')}
                        </Link>
                    </p>
                ) : (
                    lists.map((list) => (
                        <button
                            key={list.id}
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                            disabled={add.isPending || !list.default_section_id}
                            onClick={() => add.mutate(list)}
                        >
                            {list.name}
                        </button>
                    ))
                )}
            </Dropdown>
            {message && (
                <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    {message}
                </p>
            )}
        </div>
    );
}
