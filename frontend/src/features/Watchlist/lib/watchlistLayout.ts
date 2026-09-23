import type { WatchlistItemDto } from '../../../bindings/WatchlistItemDto';
import type { WatchlistSectionDto } from '../../../bindings/WatchlistSectionDto';

const SECTION_PREFIX = 'section:';
const ITEM_PREFIX = 'item:';

export function sectionDragId(id: number): string {
    return `${SECTION_PREFIX}${id}`;
}

export function itemDragId(id: number): string {
    return `${ITEM_PREFIX}${id}`;
}

export function flattenWatchlistItems(
    sections: WatchlistSectionDto[],
): WatchlistItemDto[] {
    return sections.flatMap((section) => section.items);
}

/**
 * Reorders sections or items after a drag (Laravel `moveWatchlistLayout`).
 *
 * Drag ids are prefixed (`section:1`, `item:2`) so numeric PKs cannot collide.
 */
export function moveWatchlistLayout(
    sections: WatchlistSectionDto[],
    activeId: string,
    overId: string,
): WatchlistSectionDto[] {
    const activeSectionId = parsePrefixedId(activeId, SECTION_PREFIX);
    if (activeSectionId !== null) {
        const sectionIndex = sections.findIndex(
            (section) => section.id === activeSectionId,
        );
        const overSectionId = parsePrefixedId(overId, SECTION_PREFIX);
        const overSectionIndex =
            overSectionId !== null
                ? sections.findIndex((section) => section.id === overSectionId)
                : -1;

        if (
            sectionIndex < 0 ||
            overSectionIndex < 0 ||
            sectionIndex === overSectionIndex
        ) {
            return sections;
        }

        const next = [...sections];
        const [section] = next.splice(sectionIndex, 1);
        next.splice(overSectionIndex, 0, section);
        return normalizeLayout(next);
    }

    const activeItemId = parsePrefixedId(activeId, ITEM_PREFIX);
    if (activeItemId === null) {
        return sections;
    }

    const sourceSectionIndex = sections.findIndex((section) =>
        section.items.some((item) => item.id === activeItemId),
    );
    if (sourceSectionIndex < 0) {
        return sections;
    }

    const overSectionId = parsePrefixedId(overId, SECTION_PREFIX);
    let targetSectionIndex =
        overSectionId !== null
            ? sections.findIndex((section) => section.id === overSectionId)
            : -1;
    let targetItemIndex = -1;

    if (targetSectionIndex < 0) {
        const overItemId = parsePrefixedId(overId, ITEM_PREFIX);
        if (overItemId !== null) {
            targetSectionIndex = sections.findIndex((section) => {
                targetItemIndex = section.items.findIndex(
                    (item) => item.id === overItemId,
                );
                return targetItemIndex >= 0;
            });
        }
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
        (item) => item.id === activeItemId,
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

function parsePrefixedId(value: string, prefix: string): number | null {
    if (!value.startsWith(prefix)) {
        return null;
    }
    const parsed = Number(value.slice(prefix.length));
    return Number.isInteger(parsed) ? parsed : null;
}

function normalizeLayout(
    sections: WatchlistSectionDto[],
): WatchlistSectionDto[] {
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
