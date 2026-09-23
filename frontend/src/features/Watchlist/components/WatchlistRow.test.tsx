import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import type { WatchlistItemDto } from '../../../bindings/WatchlistItemDto';
import i18n from '../../../i18n';
import { WatchlistRow } from './WatchlistRow';

const item: WatchlistItemDto = {
    id: 11,
    section_id: 1,
    position: 0,
    instrument: {
        id: 1,
        symbol: 'AAPL',
        name: 'Apple',
        exchange: 'NASDAQ',
        quote_type: 'equity',
        currency: 'USD',
        logo_url: null,
    },
};

const quote: QuoteDto = {
    symbol: 'AAPL',
    name: 'Apple',
    exchange: 'NASDAQ',
    quote_type: 'equity',
    currency: 'USD',
    regular_market_price: 110,
    regular_market_change: 10,
    regular_market_change_percent: 10,
    regular_market_previous_close: 100,
    logo_url: null,
};

describe('WatchlistRow', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('selects the symbol when its ticker is clicked', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <DndContext>
                    <ul>
                        <WatchlistRow
                            item={item}
                            quote={quote}
                            selected={false}
                            onSelect={onSelect}
                            onRemove={vi.fn()}
                        />
                    </ul>
                </DndContext>
            </MemoryRouter>,
        );

        await user.click(screen.getByText('AAPL'));

        expect(onSelect).toHaveBeenCalledOnce();
        expect(screen.getByText('Apple')).toBeTruthy();
        expect(screen.getByLabelText('Move AAPL')).toBeTruthy();
    });
});
