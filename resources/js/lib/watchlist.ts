import type { ChartPoint } from '@/types/symbol';
import type {
    PriceUpdate,
    WatchlistItem,
    WatchlistSection,
} from '@/types/watchlist';

export type SessionChange = {
    change: number;
    changePercent: number;
};

export function calculateSessionChange(
    price: PriceUpdate | null,
): SessionChange | null {
    if (!price || price.open_price === undefined || price.open_price === 0) {
        return null;
    }

    const change = price.price - price.open_price;

    return {
        change,
        changePercent: (change / price.open_price) * 100,
    };
}

export function mergePriceUpdate(
    previous: PriceUpdate | undefined,
    update: PriceUpdate,
): PriceUpdate {
    const incomingOpen =
        update.open_price !== undefined && update.open_price > 0
            ? update.open_price
            : undefined;

    return {
        ...previous,
        ...update,
        open_price: incomingOpen ?? previous?.open_price,
        previous_close:
            update.previous_close && update.previous_close > 0
                ? update.previous_close
                : previous?.previous_close,
    };
}

export function flattenWatchlistItems(
    sections: WatchlistSection[],
): WatchlistItem[] {
    return sections.flatMap((section) => section.items);
}

export function normalizeChartPoints(
    points: ChartPoint[],
): Array<{ time: string; value: number }> {
    const baseline = points.find((point) =>
        Number.isFinite(point.close),
    )?.close;

    if (baseline === undefined || baseline === 0) {
        return [];
    }

    return points.map((point) => ({
        time: point.date,
        value: ((point.close - baseline) / baseline) * 100,
    }));
}

export function moveWatchlistLayout(
    sections: WatchlistSection[],
    activeId: string,
    overId: string,
): WatchlistSection[] {
    const sectionIndex = sections.findIndex(
        (section) => section.id === activeId,
    );

    if (sectionIndex >= 0) {
        const overSectionIndex = sections.findIndex(
            (section) => section.id === overId,
        );

        if (overSectionIndex < 0 || sectionIndex === overSectionIndex) {
            return sections;
        }

        const next = [...sections];
        const [section] = next.splice(sectionIndex, 1);
        next.splice(overSectionIndex, 0, section);

        return normalizeLayout(next);
    }

    const sourceSectionIndex = sections.findIndex((section) =>
        section.items.some((item) => item.id === activeId),
    );

    if (sourceSectionIndex < 0) {
        return sections;
    }

    let targetSectionIndex = sections.findIndex(
        (section) => section.id === overId,
    );
    let targetItemIndex = -1;

    if (targetSectionIndex < 0) {
        targetSectionIndex = sections.findIndex((section) => {
            targetItemIndex = section.items.findIndex(
                (item) => item.id === overId,
            );

            return targetItemIndex >= 0;
        });
    }

    if (targetSectionIndex < 0) {
        return sections;
    }

    const next = sections.map((section) => ({
        ...section,
        items: [...section.items],
    }));
    const sourceItems = next[sourceSectionIndex].items;
    const sourceItemIndex = sourceItems.findIndex(
        (item) => item.id === activeId,
    );
    const [item] = sourceItems.splice(sourceItemIndex, 1);
    const targetItems = next[targetSectionIndex].items;

    if (
        sourceSectionIndex === targetSectionIndex &&
        targetItemIndex > sourceItemIndex
    ) {
        targetItemIndex -= 1;
    }

    const insertAt =
        targetItemIndex >= 0 ? targetItemIndex : targetItems.length;
    targetItems.splice(insertAt, 0, {
        ...item,
        section_id: next[targetSectionIndex].id,
    });

    return normalizeLayout(next);
}

function normalizeLayout(sections: WatchlistSection[]): WatchlistSection[] {
    return sections.map((section, sectionPosition) => ({
        ...section,
        position: sectionPosition,
        items: section.items.map((item, itemPosition) => ({
            ...item,
            section_id: section.id,
            position: itemPosition,
        })),
    }));
}
