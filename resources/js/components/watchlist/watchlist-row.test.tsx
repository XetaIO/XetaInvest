import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { WatchlistRow } from '@/components/watchlist/watchlist-row';
import i18n from '@/lib/i18n';

describe('WatchlistRow', () => {
    it('selects the symbol when its ticker is clicked', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();

        render(
            <I18nextProvider i18n={i18n}>
                <DndContext>
                    <ul>
                        <WatchlistRow
                            item={{
                                id: 'item-a',
                                section_id: 'section-a',
                                position: 0,
                                instrument: {
                                    id: 1,
                                    symbol: 'AAPL',
                                    name: 'Apple',
                                    exchange: 'NASDAQ',
                                    type: 'EQUITY',
                                    currency: 'USD',
                                },
                            }}
                            price={{
                                id: 'AAPL',
                                price: 110,
                                open_price: 100,
                                change: 10,
                                change_percent: 10,
                            }}
                            selected={false}
                            onSelect={onSelect}
                        />
                    </ul>
                </DndContext>
            </I18nextProvider>,
        );

        await user.click(screen.getByRole('button', { name: 'AAPL Apple' }));

        expect(onSelect).toHaveBeenCalledOnce();
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText(/110[,.]00/)).toBeInTheDocument();
        expect(screen.getByText(/\+10[,.]00%/)).toBeInTheDocument();
    });
});
